"""
SocialPlug VM Agent v2 — Real Chrome Browser
by Illy Robotic Instruments

Runs a REAL Google Chrome / Chromium browser on a virtual display (Xvfb).
Tabs are managed via Chrome DevTools Protocol (CDP) over the local debug port.
Screenshots are captured per-tab through CDP and streamed to Firestore.

Optional: --vnc flag starts x11vnc + websockify so users can interact with the
live browser via noVNC at  http://<VM_IP>:6080/vnc.html

Why this replaces Playwright:
  • Real Chrome binary — no navigator.webdriver flag, real plugins, real GPU info
  • Sites like YouTube no longer show "confirm you're not a bot"
  • Users can optionally interact with the browser in real-time via noVNC

Architecture:
  Xvfb (:99, 1920x1080x24)
   └── Google Chrome (--remote-debugging-port=9222)
        ├── Tab A → CDP screenshot every 60 s → Firestore
        ├── Tab B → CDP screenshot every 60 s → Firestore
        └── …
   └── (optional) x11vnc (:5900) → websockify (:6080) → noVNC
"""

import asyncio
import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request

import firebase_admin
from firebase_admin import credentials, firestore
import websockets

# ── Configuration ──────────────────────────────────────────────────────────────
DISPLAY = ":99"
CDP_PORT = 9222
SCREENSHOT_INTERVAL = 60   # seconds between screenshots per session
HEARTBEAT_INTERVAL = 15    # seconds between VM heartbeats
POLL_INTERVAL = 5          # seconds between session polling
MAX_TABS = 10
SCREEN_WIDTH = 1920
SCREEN_HEIGHT = 1080
VNC_PORT = 5900
WEBSOCKIFY_PORT = 6080


# ── Browser detection ─────────────────────────────────────────────────────────
def find_chrome():
    """Find the real Chrome / Chromium binary installed on the system."""
    for name in [
        "google-chrome-stable",
        "google-chrome",
        "chromium-browser",
        "chromium",
    ]:
        path = shutil.which(name)
        if path:
            return path
    # Snap location (Ubuntu 22.04 default for Chromium)
    snap_path = "/snap/bin/chromium"
    if os.path.isfile(snap_path):
        return snap_path
    return None


# ── Xvfb (virtual display) ────────────────────────────────────────────────────
def start_xvfb():
    """Start an X virtual framebuffer so Chrome has a display to render on."""
    print(f"[BOOT] Starting Xvfb on display {DISPLAY}")
    proc = subprocess.Popen(
        [
            "Xvfb", DISPLAY,
            "-screen", "0", f"{SCREEN_WIDTH}x{SCREEN_HEIGHT}x24",
            "-ac",           # disable access control
            "+extension", "RANDR",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(2)
    if proc.poll() is not None:
        raise RuntimeError("Xvfb failed to start — is it installed?")
    os.environ["DISPLAY"] = DISPLAY
    print(f"[BOOT] Xvfb running (PID {proc.pid})")
    return proc


# ── Chrome lifecycle ──────────────────────────────────────────────────────────
def start_chrome(chrome_bin):
    """Launch a real Chrome browser with CDP enabled on the virtual display."""
    print(f"[BOOT] Launching Chrome: {chrome_bin}")
    env = os.environ.copy()
    env["DISPLAY"] = DISPLAY

    proc = subprocess.Popen(
        [
            chrome_bin,
            f"--remote-debugging-port={CDP_PORT}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--disable-sync",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            f"--window-size={SCREEN_WIDTH},{SCREEN_HEIGHT}",
            "--start-maximized",
            "--lang=en-US",
            "--user-data-dir=/tmp/chrome-socialplug",
            "about:blank",
        ],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Wait for CDP to be reachable
    for attempt in range(30):
        time.sleep(1)
        if proc.poll() is not None:
            raise RuntimeError(f"Chrome exited immediately (code {proc.returncode})")
        try:
            resp = urllib.request.urlopen(
                f"http://127.0.0.1:{CDP_PORT}/json/version", timeout=3
            )
            info = json.loads(resp.read())
            print(f"[BOOT] Chrome ready — {info.get('Browser', 'unknown')}")
            return proc
        except Exception:
            continue

    raise RuntimeError("Chrome CDP not reachable after 30 s — giving up")


# ── CDP helpers ───────────────────────────────────────────────────────────────
def cdp_list_tabs():
    resp = urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json")
    return json.loads(resp.read())


def cdp_new_tab(url):
    """Open a new Chrome tab navigated to *url*.  Returns the target dict."""
    encoded = urllib.parse.quote(url, safe=":/?#[]@!$&'()*+,;=-._~%")
    resp = urllib.request.urlopen(
        f"http://127.0.0.1:{CDP_PORT}/json/new?{encoded}"
    )
    return json.loads(resp.read())


def cdp_close_tab(target_id):
    try:
        urllib.request.urlopen(
            f"http://127.0.0.1:{CDP_PORT}/json/close/{target_id}"
        )
    except Exception:
        pass


# ── Firebase init ─────────────────────────────────────────────────────────────
def init_firebase(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    return firestore.client()


# ── Public IP detection ───────────────────────────────────────────────────────
def get_public_ip():
    for url in [
        "https://api.ipify.org",
        "https://ifconfig.me/ip",
        "https://ipecho.net/plain",
    ]:
        try:
            resp = urllib.request.urlopen(url, timeout=5)
            return resp.read().decode().strip()
        except Exception:
            continue
    return None


# ── VNC server (optional live-view) ──────────────────────────────────────────
def start_vnc(novnc_path="/usr/share/novnc"):
    """Launch x11vnc → websockify so users can interact via noVNC."""
    vnc_proc = ws_proc = None

    if not shutil.which("x11vnc"):
        print("[VNC] x11vnc not installed — skipping live-view")
        return vnc_proc, ws_proc

    print("[VNC] Starting x11vnc …")
    vnc_proc = subprocess.Popen(
        [
            "x11vnc",
            "-display", DISPLAY,
            "-nopw",
            "-forever",
            "-shared",
            "-rfbport", str(VNC_PORT),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(1)

    if shutil.which("websockify"):
        web_flag = []
        if os.path.isdir(novnc_path):
            web_flag = ["--web", novnc_path]
        print(f"[VNC] Starting websockify on port {WEBSOCKIFY_PORT} …")
        ws_proc = subprocess.Popen(
            ["websockify", *web_flag, str(WEBSOCKIFY_PORT), f"localhost:{VNC_PORT}"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print(f"[VNC] noVNC live-view ready at http://<VM_IP>:{WEBSOCKIFY_PORT}/vnc.html")
    else:
        print("[VNC] websockify not installed — VNC available only on raw port 5900")

    return vnc_proc, ws_proc


# ── Per-session runner ────────────────────────────────────────────────────────
async def run_session(db, doc_id, session_doc):
    """Open a Chrome tab for one session.  Captures screenshots via CDP until
    the session is stopped or deleted in Firestore."""
    session_id = session_doc.id
    url = session_doc.to_dict()["url"]
    session_ref = db.collection("sessions").document(session_id)
    target_id = None

    print(f"[SESSION {session_id}] Opening {url}")
    try:
        # 1. Open a new Chrome tab via CDP
        tab = cdp_new_tab(url)
        target_id = tab["id"]
        ws_url = tab.get("webSocketDebuggerUrl", "")

        # Give the page time to load
        await asyncio.sleep(8)

        # 2. Mark session as running
        session_ref.update({"status": "running"})

        if not ws_url:
            print(f"[SESSION {session_id}] No CDP WebSocket URL — screenshots disabled")
            # Keep session alive but no screenshots
            while True:
                snap = session_ref.get()
                if not snap.exists:
                    break
                if snap.to_dict().get("status", "") in ("stopping", "stopped"):
                    break
                await asyncio.sleep(POLL_INTERVAL)
            return

        # 3. Screenshot loop over a persistent CDP WebSocket
        async with websockets.connect(ws_url, max_size=20 * 1024 * 1024) as ws:
            cmd_id = 0
            while True:
                snap = session_ref.get()
                if not snap.exists:
                    break
                status = snap.to_dict().get("status", "")
                if status in ("stopping", "stopped"):
                    break

                try:
                    cmd_id += 1
                    await ws.send(json.dumps({
                        "id": cmd_id,
                        "method": "Page.captureScreenshot",
                        "params": {"format": "jpeg", "quality": 50},
                    }))

                    # Drain events until we get the matching response
                    while True:
                        raw = await asyncio.wait_for(ws.recv(), timeout=15)
                        msg = json.loads(raw)
                        if msg.get("id") == cmd_id:
                            b64 = msg.get("result", {}).get("data")
                            if b64:
                                data_uri = f"data:image/jpeg;base64,{b64}"
                                session_ref.update({
                                    "latestScreenshot": data_uri,
                                    "screenshotUpdatedAt": firestore.SERVER_TIMESTAMP,
                                })
                                print(f"[SESSION {session_id}] Screenshot OK")
                            break
                except asyncio.TimeoutError:
                    print(f"[SESSION {session_id}] Screenshot timed out (non-fatal)")
                except websockets.exceptions.ConnectionClosed:
                    print(f"[SESSION {session_id}] CDP WebSocket closed — tab may have navigated")
                    break
                except Exception as e:
                    print(f"[SESSION {session_id}] Screenshot error: {e}")

                await asyncio.sleep(SCREENSHOT_INTERVAL)

    except Exception as e:
        print(f"[SESSION {session_id}] Error: {e}")
    finally:
        if target_id:
            cdp_close_tab(target_id)
        try:
            session_ref.update({"status": "stopped"})
        except Exception:
            pass
        print(f"[SESSION {session_id}] Closed")


# ── Heartbeat ─────────────────────────────────────────────────────────────────
async def heartbeat_loop(vm_ref, active_tasks):
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


# ── Remote command handler ────────────────────────────────────────────────────
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.join(os.path.expanduser("~"), "SocialPlug")

def run_self_update():
    """Pull latest code from GitHub and copy agent files into place."""
    print("[CMD] Running self-update …")
    try:
        # Pull latest from GitHub
        if os.path.isdir(REPO_DIR):
            subprocess.check_call(["git", "-C", REPO_DIR, "pull", "--ff-only"], timeout=60)
        else:
            subprocess.check_call(
                ["git", "clone", "https://github.com/illmedicine/SocialPlug.git", REPO_DIR],
                timeout=120,
            )

        # Copy updated files into agent dir
        import shutil as _sh
        for fname in ("agent.py", "requirements.txt"):
            src = os.path.join(REPO_DIR, "vm-agent", fname)
            dst = os.path.join(AGENT_DIR, fname)
            if os.path.isfile(src):
                _sh.copy2(src, dst)
                print(f"[CMD]   Copied {fname}")

        # Install any new Python deps
        venv_pip = os.path.join(AGENT_DIR, "venv", "bin", "pip")
        if os.path.isfile(venv_pip):
            subprocess.check_call(
                [venv_pip, "install", "-r", os.path.join(AGENT_DIR, "requirements.txt")],
                timeout=120,
            )

        print("[CMD] Self-update complete — restarting via systemd …")
        subprocess.Popen(["sudo", "systemctl", "restart", "socialplug-agent"])
        return True
    except Exception as e:
        print(f"[CMD] Self-update failed: {e}")
        return False


def run_restart():
    """Restart the agent via systemd."""
    print("[CMD] Restarting agent via systemd …")
    subprocess.Popen(["sudo", "systemctl", "restart", "socialplug-agent"])
    return True


async def handle_commands(vm_ref):
    """Check for and execute a pending remote command on the VM doc."""
    try:
        snap = vm_ref.get()
        if not snap.exists:
            return
        data = snap.to_dict()
        cmd = data.get("pendingCommand")
        if not cmd:
            return

        print(f"[CMD] Received command: {cmd}")
        # Clear the command immediately so it doesn't re-execute
        vm_ref.update({
            "pendingCommand": firestore.DELETE_FIELD,
            "lastCommandResult": f"executing: {cmd}",
            "lastCommandAt": firestore.SERVER_TIMESTAMP,
        })

        success = False
        if cmd == "update":
            success = run_self_update()
        elif cmd == "restart":
            success = run_restart()
        else:
            print(f"[CMD] Unknown command: {cmd}")
            vm_ref.update({"lastCommandResult": f"unknown command: {cmd}"})
            return

        vm_ref.update({
            "lastCommandResult": f"{'ok' if success else 'failed'}: {cmd}",
        })

    except Exception as e:
        print(f"[CMD] Error handling command: {e}")


# ── Main agent loop ──────────────────────────────────────────────────────────
async def agent_loop(vm_id, cred_path, enable_vnc=False):
    """
    1. Init Firebase
    2. Start Xvfb virtual display
    3. Launch real Chrome with CDP
    4. (optional) Start VNC for live interactive access
    5. Mark VM as "online"
    6. Heartbeat + poll Firestore for sessions → open Chrome tabs
    """
    print(f"[AGENT] SocialPlug Agent v2 starting for VM: {vm_id}")
    db = init_firebase(cred_path)

    # ── Locate the Firestore VM document ────────────────────────────────────
    vm_ref = None
    doc_id = vm_id
    try:
        snap = db.collection("vms").document(vm_id).get()
        if snap.exists:
            vm_ref = db.collection("vms").document(vm_id)
            doc_id = vm_id
            print(f"[AGENT] Found VM by doc ID: {vm_id}")
    except Exception:
        pass

    if vm_ref is None:
        print(f"[AGENT] Searching for VM with name={vm_id} …")
        results = list(
            db.collection("vms").where("name", "==", vm_id).limit(1).stream()
        )
        if results:
            doc_id = results[0].id
            vm_ref = db.collection("vms").document(doc_id)
            print(f"[AGENT] Found VM doc: {doc_id} (name={vm_id})")
        else:
            print(f"[AGENT] ERROR: No VM with name or ID '{vm_id}'. Exiting.")
            sys.exit(1)

    vm_ref.update({"status": "booting", "lastSeen": firestore.SERVER_TIMESTAMP})

    # ── Find Chrome ─────────────────────────────────────────────────────────
    chrome_bin = find_chrome()
    if not chrome_bin:
        print("[AGENT] ERROR: No Chrome / Chromium found. Run setup-vm.sh first.")
        sys.exit(1)
    print(f"[AGENT] Using browser: {chrome_bin}")

    # ── Start Xvfb ──────────────────────────────────────────────────────────
    xvfb_proc = start_xvfb()

    # ── Start Chrome ────────────────────────────────────────────────────────
    chrome_proc = start_chrome(chrome_bin)

    # ── Optional VNC ────────────────────────────────────────────────────────
    vnc_proc, ws_proc = (None, None)
    if enable_vnc:
        vnc_proc, ws_proc = start_vnc()

    # ── Detect public IP ────────────────────────────────────────────────────
    public_ip = get_public_ip()

    # ── Mark VM as online ───────────────────────────────────────────────────
    vm_update = {
        "status": "online",
        "activeSessions": 0,
        "lastSeen": firestore.SERVER_TIMESTAMP,
        "browserType": "chrome",
    }
    if public_ip:
        vm_update["publicIp"] = public_ip
    if enable_vnc and ws_proc:
        vm_update["vncPort"] = WEBSOCKIFY_PORT
    vm_ref.update(vm_update)

    print("[AGENT] Chrome is READY — VM is ONLINE")
    if public_ip:
        print(f"[AGENT] Public IP: {public_ip}")
    if enable_vnc and ws_proc:
        print(f"[AGENT] noVNC: http://{public_ip or '<VM_IP>'}:{WEBSOCKIFY_PORT}/vnc.html")

    # ── Close the default about:blank tab Chrome opens ──────────────────────
    try:
        for tab in cdp_list_tabs():
            if tab.get("url") == "about:blank" and tab.get("type") == "page":
                cdp_close_tab(tab["id"])
    except Exception:
        pass

    # ── Main loop ───────────────────────────────────────────────────────────
    active_tasks: dict[str, asyncio.Task] = {}
    hb_task = asyncio.create_task(heartbeat_loop(vm_ref, active_tasks))

    try:
        while True:
            # Check if Chrome is still alive
            if chrome_proc.poll() is not None:
                print("[AGENT] Chrome exited — restarting …")
                chrome_proc = start_chrome(chrome_bin)

            # Check for remote commands (update, restart, etc.)
            await handle_commands(vm_ref)

            for status_filter in ("pending", "running"):
                sessions = (
                    db.collection("sessions")
                    .where("vmId", "==", doc_id)
                    .where("status", "==", status_filter)
                    .stream()
                )
                for session_doc in sessions:
                    sid = session_doc.id
                    if sid not in active_tasks and len(active_tasks) < MAX_TABS:
                        task = asyncio.create_task(
                            run_session(db, doc_id, session_doc)
                        )
                        active_tasks[sid] = task

            # Clean up completed tasks
            done = [sid for sid, t in active_tasks.items() if t.done()]
            for sid in done:
                del active_tasks[sid]

            await asyncio.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        print("[AGENT] Shutting down …")
    finally:
        hb_task.cancel()
        for task in active_tasks.values():
            task.cancel()

        # Terminate child processes
        for proc in [chrome_proc, xvfb_proc, vnc_proc, ws_proc]:
            if proc and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()

        vm_ref.update({"status": "offline", "activeSessions": 0})
        print("[AGENT] Shutdown complete")


def main():
    parser = argparse.ArgumentParser(description="SocialPlug VM Agent v2")
    parser.add_argument("--vm-id", required=True, help="Firestore VM document ID or name")
    parser.add_argument(
        "--cred", default="firebase-credentials.json",
        help="Path to Firebase service account JSON",
    )
    parser.add_argument(
        "--vnc", action="store_true",
        help="Enable x11vnc + websockify for live interactive browser access on port 6080",
    )
    parser.add_argument(
        "--bucket", default="",
        help="(Unused, kept for backwards compat)",
    )
    args = parser.parse_args()

    asyncio.run(agent_loop(args.vm_id, args.cred, args.vnc))


if __name__ == "__main__":
    main()
