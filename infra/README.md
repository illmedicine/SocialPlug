# SocialPlug — Oracle Cloud Infrastructure Setup

Automated provisioning of 4 Always Free ARM Ampere A1 VMs on Oracle Cloud.

## What You Get (Free Forever)

| Resource              | Per VM                        | Total (4 VMs) |
|-----------------------|-------------------------------|---------------|
| **Shape**             | VM.Standard.A1.Flex           | –             |
| **OCPUs**             | 1                             | 4             |
| **RAM**               | 6 GB                          | 24 GB         |
| **Boot Volume**       | 47 GB (Ubuntu 22.04 ARM)      | 188 GB        |
| **Public IP**         | 1 ephemeral                   | 4             |
| **Outbound**          | 10 TB/month shared            | –             |

> Oracle Always Free Tier gives 4 OCPUs + 24 GB RAM for A1.Flex — enough for exactly 4 instances at 1 OCPU / 6 GB each.

---

## Option A: One-Click Terraform (Recommended)

### Prerequisites

1. **Oracle Cloud account** — sign up free at https://cloud.oracle.com
2. **Terraform** — `winget install HashiCorp.Terraform` (Windows) or `brew install terraform` (Mac)
3. **OCI CLI** (optional but useful) — https://github.com/oracle/oci-cli

### Quick Start

```bash
cd infra/terraform

# 1. Copy the example vars file and fill in your OCI details
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your tenancy OCID, compartment OCID, etc.

# 2. Initialize Terraform
terraform init

# 3. Preview what will be created
terraform plan

# 4. Create all 4 VMs + networking
terraform apply
# Type "yes" when prompted

# 5. Note the output IPs — the SocialPlug agent auto-installs on each VM
```

After `terraform apply`, each VM will:
- Boot Ubuntu 22.04 ARM
- Run the cloud-init script that installs the SocialPlug agent
- Auto-register with Firebase and appear in your dashboard
- Start heartbeating every 15s

### Tear Down

```bash
terraform destroy   # removes all 4 VMs + networking
```

---

## Option B: OCI CLI Script (No Terraform)

If you prefer not to install Terraform:

```bash
# 1. Install OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# 2. Configure (follow prompts — needs tenancy OCID + API key)
oci setup config

# 3. Run the provisioning script
cd infra
bash oci-provision.sh
```

The script creates a VCN, subnet, security list, internet gateway, and all 4 VMs.

---

## Option C: Manual Console Setup

If you prefer the OCI web console:

1. **Create a VCN** — Networking → Virtual Cloud Networks → Start VCN Wizard → "Create VCN with Internet Connectivity"
2. **Open ports** — Edit the public subnet's security list: add ingress rules for TCP 22 (SSH) and TCP 443 (HTTPS)
3. **Create 4 instances** — Compute → Create Instance:
   - Shape: VM.Standard.A1.Flex
   - OCPU: 1, Memory: 6 GB
   - Image: Canonical Ubuntu 22.04 (aarch64)
   - Subnet: your public subnet
   - Add your SSH public key
   - Under Advanced → Cloud-init: paste the contents of `infra/cloud-init.yaml`
4. Repeat for all 4 VMs (name them `socialplug-vm-1` through `socialplug-vm-4`)

---

## After Provisioning

Once VMs are running:

1. **SSH in** (only if needed for debugging):
   ```bash
   ssh -i ~/.ssh/socialplug_key ubuntu@<VM_PUBLIC_IP>
   ```

2. **Check agent status**:
   ```bash
   sudo systemctl status socialplug-agent
   ```

3. **View logs**:
   ```bash
   journalctl -u socialplug-agent -f
   ```

The agent handles everything else — it auto-installs Chromium, connects to Firebase, and starts accepting sessions from the SocialPlug dashboard.

---

## Firebase Service Account

Each VM agent needs a Firebase service account key to write to Firestore/Storage. You have two options:

### Option 1: Download a key file (simplest)
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `service-account.json`
4. SCP it to each VM:
   ```bash
   scp -i ~/.ssh/socialplug_key service-account.json ubuntu@<IP>:~/socialplug-agent/
   ```

### Option 2: Set the key via Firestore (automated)
The agent checks Firestore doc `vms/<VM_ID>` for an `agentKey` field. If using the auto-seeded VMs, each VM already has a unique `agentKey` in Firestore. Configure the agent to authenticate using this key.

---

## Avoiding Idle Reclamation

Oracle reclaims Always Free VMs if they're idle for 7 days (CPU < 20%, Network < 20%, Memory < 20%). The SocialPlug agent's heartbeat loop and Chromium sessions prevent this, but if VMs are toggled "off" for extended periods, consider:

- Running a lightweight cron job: `*/5 * * * * dd if=/dev/urandom bs=1M count=10 of=/dev/null`
- Keeping at least one session active per VM
