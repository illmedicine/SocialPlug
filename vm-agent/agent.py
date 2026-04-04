"""
SocialPlug VM Agent — by Illy Robotic Instruments
Runs on each cloud VM (Oracle Cloud Free Tier, etc).
On startup: installs Playwright browsers if needed, launches headless Chromium,
heartbeats to Firestore every 15s, polls for pending session commands,
takes periodic screenshots, and uploads them to Firebase Storage.
The VM is marked "ready" only after Chromium launches successfully.
"""
import asyncio
import argparse
import subprocess
import shutil
import sys
import time
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore, storage
from playwright.async_api import async_playwright

# ── Configuration ──────────────────────────────────────────────────────────────
SCREENSHOT_INTERVAL = 60   # seconds between screenshots per session
HEARTBEAT_INTERVAL = 15    # seconds between VM heartbeats
POLL_INTERVAL = 5          # seconds between session polling
MAX_TABS = 10


# ── Bootstrap ──────────────────────────────────────────────────────────────────
def ensure_playwright_browsers():
    """Install Playwright Chromium if not already present."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            path = p.chromium.executable_path
            if path and shutil.which(path):
                print(f"[BOOT] Chromium already installed at {path}")
                return
    except Exception:
        pass
    print("[BOOT] Installing Playwright Chromium…")
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install-deps", "chromium"])
    print("[BOOT] Chromium installed successfully")


def init_firebase(cred_path, storage_bucket):
    """Initialize Firebase Admin SDK."""
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {"storageBucket": storage_bucket})
    return firestore.client(), storage.bucket()


# ── Screenshot helpers ─────────────────────────────────────────────────────────
async def take_screenshot(page):
    """Capture a viewport screenshot and return PNG bytes."""
    return await page.screenshot(type="png", full_page=False)


async def upload_screenshot(bucket, vm_id, session_id, screenshot_bytes):
    """Upload screenshot to Firebase Storage and return its public URL."""
    blob_name = f"screenshots/{vm_id}/{session_id}/{int(time.time())}.png"
    blob = bucket.blob(blob_name)
    blob.upload_from_string(screenshot_bytes, content_type="image/png")
    blob.make_public()
    return blob.public_url


# ── Session runner ─────────────────────────────────────────────────────────────
async def run_session(browser, db, bucket, vm_id, session_doc):
    """Manage a single Chrome tab session with automatic screenshot loop."""
    session_id = session_doc.id
    session_data = session_doc.to_dict()
    url = session_data["url"]

    print(f"[SESSION {session_id}] Opening {url}")

    try:
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)

        # Mark session as running
        session_ref = db.collection("sessions").document(session_id)
        session_ref.update({"status": "running"})

        # Automatic screenshot loop — runs until session is stopped
        while True:
            current = session_ref.get()
            if not current.exists:
                break
            status = current.to_dict().get("status", "")
            if status in ("stopping", "stopped"):
                break

            try:
                screenshot_bytes = await take_screenshot(page)
                public_url = await upload_screenshot(
                    bucket, vm_id, session_id, screenshot_bytes
                )
                session_ref.update({
                    "latestScreenshot": public_url,
                    "screenshotUpdatedAt": firestore.SERVER_TIMESTAMP,
                })
                print(f"[SESSION {session_id}] Screenshot → {public_url}")
            except Exception as e:
                print(f"[SESSION {session_id}] Screenshot failed (non-fatal): {e}")

            await asyncio.sleep(SCREENSHOT_INTERVAL)

    except Exception as e:
        print(f"[SESSION {session_id}] Error: {e}")
    finally:
        try:
            await context.close()
        except Exception:
            pass
        try:
            db.collection("sessions").document(session_id).update({"status": "stopped"})
        except Exception:
            pass
        print(f"[SESSION {session_id}] Closed")


# ── Heartbeat ──────────────────────────────────────────────────────────────────
async def heartbeat_loop(vm_ref, active_tasks):
    """Send periodic heartbeat so the frontend knows this VM is alive & ready."""
    while True:
        try:
            vm_ref.update({
                "status": "online",
                "activeSessions": len(active_tasks),
                "lastSeen": firestore.SERVER_TIMESTAMP,
            })
        except Exception as e:
            print(f"[HEARTBEAT] Error: {e}")
        await asyncio.sleep(HEARTBEAT_INTERVAL)


# ── Main agent loop ───────────────────────────────────────────────────────────
async def agent_loop(vm_id, cred_path, storage_bucket):
    """
    Startup sequence:
      1. Init Firebase
      2. Install Playwright Chromium if missing (auto)
      3. Launch headless Chromium
      4. Mark VM as "online" (= ready) — only after Chromium is confirmed
      5. Start heartbeat
      6. Poll Firestore for pending sessions → auto-launch Chrome tabs
    """
    print(f"[AGENT] SocialPlug agent starting for VM: {vm_id}")
    db, bucket = init_firebase(cred_path, storage_bucket)

    # Auto-discover Firestore document: vm_id may be a human name like "VM-1"
    # rather than the actual Firestore doc ID. Query by name to find the doc.
    vm_ref = None
    doc_id = vm_id
    try:
        # First try as literal doc ID
        snap = db.collection("vms").document(vm_id).get()
        if snap.exists:
            vm_ref = db.collection("vms").document(vm_id)
            doc_id = vm_id
            print(f"[AGENT] Found VM by doc ID: {vm_id}")
    except Exception:
        pass

    if vm_ref is None:
        # Query by name field
        print(f"[AGENT] Searching for VM with name={vm_id}…")
        results = list(db.collection("vms").where("name", "==", vm_id).limit(1).stream())
        if results:
            doc_id = results[0].id
            vm_ref = db.collection("vms").document(doc_id)
            print(f"[AGENT] Found VM doc: {doc_id} (name={vm_id})")
        else:
            print(f"[AGENT] ERROR: No VM found with name or ID '{vm_id}'. Exiting.")
            sys.exit(1)

    # Signal that we're booting (not yet ready)
    vm_ref.update({
        "status": "booting",
        "lastSeen": firestore.SERVER_TIMESTAMP,
    })

    # Auto-install Chromium
    ensure_playwright_browsers()

    active_tasks: dict[str, asyncio.Task] = {}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-software-rasterizer",
            ],
        )
        print("[AGENT] Chromium launched — VM is READY")

        # Now we're truly ready
        vm_ref.update({
            "status": "online",
            "activeSessions": 0,
            "lastSeen": firestore.SERVER_TIMESTAMP,
        })

        # Start heartbeat in background
        hb_task = asyncio.create_task(heartbeat_loop(vm_ref, active_tasks))

        try:
            while True:
                # Poll for pending sessions (vmId in sessions = Firestore doc ID)
                pending = (
                    db.collection("sessions")
                    .where("vmId", "==", doc_id)
                    .where("status", "==", "pending")
                    .stream()
                )

                for session_doc in pending:
                    sid = session_doc.id
                    if sid not in active_tasks and len(active_tasks) < MAX_TABS:
                        task = asyncio.create_task(
                            run_session(browser, db, bucket, doc_id, session_doc)
                        )
                        active_tasks[sid] = task

                # Clean up completed tasks
                done = [sid for sid, t in active_tasks.items() if t.done()]
                for sid in done:
                    del active_tasks[sid]

                await asyncio.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            print("[AGENT] Shutting down…")
        finally:
            hb_task.cancel()
            for task in active_tasks.values():
                task.cancel()
            await browser.close()
            vm_ref.update({"status": "offline", "activeSessions": 0})
            print("[AGENT] Shutdown complete")


def main():
    parser = argparse.ArgumentParser(description="SocialPlug VM Agent")
    parser.add_argument("--vm-id", required=True, help="Firestore VM document ID")
    parser.add_argument(
        "--cred",
        default="firebase-credentials.json",
        help="Path to Firebase service account JSON",
    )
    parser.add_argument(
        "--bucket",
        default="livepay-petition.appspot.com",
        help="Firebase Storage bucket",
    )
    args = parser.parse_args()

    asyncio.run(agent_loop(args.vm_id, args.cred, args.bucket))


if __name__ == "__main__":
    main()
