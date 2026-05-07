/**
 * SocialPlug Cloud Functions — VM Lifecycle Management
 * by Illy Robotic Instruments
 *
 * Callable functions that let the frontend start/stop/restart Azure VMs
 * and send remote commands to the VM agent (update, restart agent) via
 * Firestore's pendingCommand field.
 *
 * Environment secrets (set via `firebase functions:secrets:set`):
 *   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ── Azure secrets (set once, stored encrypted by Firebase) ──────────────────
const AZURE_TENANT_ID = defineSecret("AZURE_TENANT_ID");
const AZURE_CLIENT_ID = defineSecret("AZURE_CLIENT_ID");
const AZURE_CLIENT_SECRET = defineSecret("AZURE_CLIENT_SECRET");
const AZURE_SUBSCRIPTION_ID = defineSecret("AZURE_SUBSCRIPTION_ID");

const RESOURCE_GROUP = "socialplug-rg";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function verifyVMOwnership(uid, vmId) {
  const snap = await db.collection("vms").doc(vmId).get();
  if (!snap.exists) throw new HttpsError("not-found", "VM not found");
  if (snap.data().userId !== uid)
    throw new HttpsError("permission-denied", "Not your VM");
  return snap.data();
}

function getAzureClient() {
  const { ClientSecretCredential } = require("@azure/identity");
  const { ComputeManagementClient } = require("@azure/arm-compute");

  const credential = new ClientSecretCredential(
    AZURE_TENANT_ID.value(),
    AZURE_CLIENT_ID.value(),
    AZURE_CLIENT_SECRET.value()
  );
  return new ComputeManagementClient(
    credential,
    AZURE_SUBSCRIPTION_ID.value()
  );
}

function azureVMName(vmData) {
  // Map Firestore VM name (VM-1, VM-2) → Azure resource name
  const name = vmData.name || "";
  const idx = name.replace(/\D/g, "");
  return `socialplug-vm-${idx}`;
}

// ── Agent commands (works for any provider) ─────────────────────────────────

/**
 * sendAgentCommand — set a pendingCommand on the VM doc.
 * The agent polls this field every 5 s and executes it.
 * Supported commands: "update" (pull code + restart), "restart"
 */
exports.sendAgentCommand = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first");

  const { vmId, command } = request.data;
  if (!vmId || !command)
    throw new HttpsError("invalid-argument", "vmId and command required");

  const allowed = ["update", "restart"];
  if (!allowed.includes(command))
    throw new HttpsError("invalid-argument", `Command must be: ${allowed.join(", ")}`);

  await verifyVMOwnership(request.auth.uid, vmId);

  await db.collection("vms").doc(vmId).update({
    pendingCommand: command,
    lastCommandAt: admin.firestore.FieldValue.serverTimestamp(),
    lastCommandResult: `queued: ${command}`,
  });

  return { success: true, message: `Command '${command}' sent to agent` };
});

// ── Azure VM lifecycle ──────────────────────────────────────────────────────

/**
 * startVM — Power on a deallocated Azure VM.
 */
exports.startVM = onCall(
  { secrets: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first");
    const { vmId } = request.data;
    if (!vmId) throw new HttpsError("invalid-argument", "vmId required");

    const vmData = await verifyVMOwnership(request.auth.uid, vmId);
    if (vmData.provider !== "azure")
      throw new HttpsError("failed-precondition", "Only Azure VMs can be started from here");

    const client = getAzureClient();
    const vmName = azureVMName(vmData);

    await db.collection("vms").doc(vmId).update({ status: "booting" });

    try {
      await client.virtualMachines.beginStartAndWait(RESOURCE_GROUP, vmName);
      return { success: true, message: `${vmName} started` };
    } catch (err) {
      await db.collection("vms").doc(vmId).update({ status: "offline" });
      throw new HttpsError("internal", `Failed to start VM: ${err.message}`);
    }
  }
);

/**
 * stopVM — Deallocate an Azure VM (no charges while stopped).
 */
exports.stopVM = onCall(
  { secrets: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first");
    const { vmId } = request.data;
    if (!vmId) throw new HttpsError("invalid-argument", "vmId required");

    const vmData = await verifyVMOwnership(request.auth.uid, vmId);
    if (vmData.provider !== "azure")
      throw new HttpsError("failed-precondition", "Only Azure VMs supported");

    const client = getAzureClient();
    const vmName = azureVMName(vmData);

    await db.collection("vms").doc(vmId).update({ status: "offline" });

    try {
      await client.virtualMachines.beginDeallocateAndWait(RESOURCE_GROUP, vmName);
      return { success: true, message: `${vmName} deallocated` };
    } catch (err) {
      throw new HttpsError("internal", `Failed to stop VM: ${err.message}`);
    }
  }
);

/**
 * restartVM — Reboot an Azure VM.
 */
exports.restartVM = onCall(
  { secrets: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first");
    const { vmId } = request.data;
    if (!vmId) throw new HttpsError("invalid-argument", "vmId required");

    const vmData = await verifyVMOwnership(request.auth.uid, vmId);
    if (vmData.provider !== "azure")
      throw new HttpsError("failed-precondition", "Only Azure VMs supported");

    const client = getAzureClient();
    const vmName = azureVMName(vmData);

    await db.collection("vms").doc(vmId).update({ status: "booting" });

    try {
      await client.virtualMachines.beginRestartAndWait(RESOURCE_GROUP, vmName);
      return { success: true, message: `${vmName} restarted` };
    } catch (err) {
      throw new HttpsError("internal", `Failed to restart VM: ${err.message}`);
    }
  }
);

/**
 * deleteVM — Delete an Azure VM and its Firestore document + sessions.
 * ⚠ This is destructive! The VM, its disk, NIC, and public IP are deleted.
 */
exports.deleteVM = onCall(
  { secrets: [AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first");
    const { vmId, confirm } = request.data;
    if (!vmId) throw new HttpsError("invalid-argument", "vmId required");
    if (confirm !== true)
      throw new HttpsError("invalid-argument", "Set confirm: true to delete");

    const vmData = await verifyVMOwnership(request.auth.uid, vmId);
    if (vmData.provider !== "azure")
      throw new HttpsError("failed-precondition", "Only Azure VMs supported");

    const client = getAzureClient();
    const vmName = azureVMName(vmData);

    try {
      // Delete the Azure VM (this also deletes the OS disk)
      await client.virtualMachines.beginDeleteAndWait(RESOURCE_GROUP, vmName);

      // Clean up NIC and Public IP
      const { NetworkManagementClient } = require("@azure/arm-network");
      const { ClientSecretCredential } = require("@azure/identity");
      const netCred = new ClientSecretCredential(
        AZURE_TENANT_ID.value(),
        AZURE_CLIENT_ID.value(),
        AZURE_CLIENT_SECRET.value()
      );
      const netClient = new NetworkManagementClient(
        netCred,
        AZURE_SUBSCRIPTION_ID.value()
      );
      try {
        await netClient.networkInterfaces.beginDeleteAndWait(RESOURCE_GROUP, `${vmName}-nic`);
        await netClient.publicIPAddresses.beginDeleteAndWait(RESOURCE_GROUP, `${vmName}-pip`);
      } catch (_) {
        // Non-critical — resources may already be gone
      }

      // Delete all sessions for this VM
      const sessionsSnap = await db
        .collection("sessions")
        .where("vmId", "==", vmId)
        .get();
      const batch = db.batch();
      sessionsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(db.collection("vms").doc(vmId));
      await batch.commit();

      return { success: true, message: `${vmName} deleted` };
    } catch (err) {
      throw new HttpsError("internal", `Failed to delete VM: ${err.message}`);
    }
  }
);
