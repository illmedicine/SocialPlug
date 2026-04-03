"""
Echo Vue VM Agent
Runs on each Oracle Cloud Free Tier VM.
Listens to Firestore for session commands, launches Chrome via Playwright,
takes periodic screenshots, and uploads them to Firebase Storage.
"""
import asyncio
import argparse
import io
import time
import uuid
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore, storage
from playwright.async_api import async_playwright

# ── Configuration ──────────────────────────────────────────────────────────────
SCREENSHOT_INTERVAL = 60  # seconds
MAX_TABS = 10


def init_firebase(cred_path, storage_bucket):
    """Initialize Firebase Admin SDK."""
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {"storageBucket": storage_bucket})
    return firestore.client(), storage.bucket()


async def take_screenshot(page):
    """Capture a screenshot and return bytes."""
    return await page.screenshot(type="png", full_page=False)


async def upload_screenshot(bucket, vm_id, session_id, screenshot_bytes):
    """Upload screenshot to Firebase Storage and return public URL."""
    blob_name = f"screenshots/{vm_id}/{session_id}/{int(time.time())}.png"
    blob = bucket.blob(blob_name)
    blob.upload_from_string(screenshot_bytes, content_type="image/png")
    blob.make_public()
    return blob.public_url


async def run_session(browser, db, bucket, vm_id, session_doc):
    """Manage a single Chrome tab session."""
    session_id = session_doc.id
    session_data = session_doc.to_dict()
    url = session_data["url"]

    print(f"[SESSION {session_id}] Opening {url}")

    try:
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)

        # Mark session as running
        session_ref = db.collection("sessions").document(session_id)
        session_ref.update({"status": "running"})

        # Screenshot loop
        while True:
            current = session_ref.get()
            if not current.exists:
                break
            current_data = current.to_dict()
            if current_data.get("status") in ("stopping", "stopped"):
                break

            # Take screenshot
            screenshot_bytes = await take_screenshot(page)
            public_url = await upload_screenshot(
                bucket, vm_id, session_id, screenshot_bytes
            )

            # Update Firestore with latest screenshot URL
            session_ref.update(
                {
                    "latestScreenshot": public_url,
                    "screenshotUpdatedAt": firestore.SERVER_TIMESTAMP,
                }
            )
            print(f"[SESSION {session_id}] Screenshot uploaded: {public_url}")

            await asyncio.sleep(SCREENSHOT_INTERVAL)

    except Exception as e:
        print(f"[SESSION {session_id}] Error: {e}")
    finally:
        try:
            await context.close()
        except Exception:
            pass
        # Mark stopped
        try:
            db.collection("sessions").document(session_id).update({"status": "stopped"})
        except Exception:
            pass
        print(f"[SESSION {session_id}] Closed")


async def agent_loop(vm_id, cred_path, storage_bucket):
    """Main agent loop: listen for new sessions and manage Chrome."""
    print(f"[AGENT] Starting Echo Vue agent for VM: {vm_id}")
    db, bucket = init_firebase(cred_path, storage_bucket)

    # Mark VM as online
    vm_ref = db.collection("vms").document(vm_id)
    vm_ref.update({"status": "online", "lastSeen": firestore.SERVER_TIMESTAMP})

    active_tasks = {}  # session_id -> asyncio.Task

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
        print("[AGENT] Chromium browser launched")

        try:
            while True:
                # Query pending sessions for this VM
                pending = (
                    db.collection("sessions")
                    .where("vmId", "==", vm_id)
                    .where("status", "==", "pending")
                    .stream()
                )

                for session_doc in pending:
                    sid = session_doc.id
                    if sid not in active_tasks and len(active_tasks) < MAX_TABS:
                        task = asyncio.create_task(
                            run_session(browser, db, bucket, vm_id, session_doc)
                        )
                        active_tasks[sid] = task

                # Clean up completed tasks
                done = [sid for sid, task in active_tasks.items() if task.done()]
                for sid in done:
                    del active_tasks[sid]

                # Update VM status
                vm_ref.update(
                    {
                        "activeSessions": len(active_tasks),
                        "lastSeen": firestore.SERVER_TIMESTAMP,
                        "status": "online",
                    }
                )

                await asyncio.sleep(5)  # Poll every 5 seconds

        except KeyboardInterrupt:
            print("[AGENT] Shutting down...")
        finally:
            # Cancel all active sessions
            for task in active_tasks.values():
                task.cancel()
            await browser.close()
            vm_ref.update({"status": "offline", "activeSessions": 0})
            print("[AGENT] Shutdown complete")


def main():
    parser = argparse.ArgumentParser(description="Echo Vue VM Agent")
    parser.add_argument("--vm-id", required=True, help="Firestore VM document ID")
    parser.add_argument(
        "--cred",
        default="firebase-credentials.json",
        help="Path to Firebase service account JSON",
    )
    parser.add_argument(
        "--bucket",
        default="",
        help="Firebase Storage bucket (e.g. your-project.appspot.com)",
    )
    args = parser.parse_args()

    asyncio.run(agent_loop(args.vm_id, args.cred, args.bucket))


if __name__ == "__main__":
    main()
