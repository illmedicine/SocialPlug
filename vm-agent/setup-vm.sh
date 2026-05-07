#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# SocialPlug VM Agent v2 — Automated Setup
# by Illy Robotic Instruments
#
# Run this on a fresh Ubuntu 22.04+ instance (x86_64 or ARM64).
# After setup the agent starts automatically on boot via systemd.
#
# What's new in v2:
#   • Real Google Chrome / Chromium (not Playwright's bundled browser)
#   • Runs on a virtual display (Xvfb) — looks like a real desktop
#   • Tabs managed via Chrome DevTools Protocol (CDP)
#   • Optional: --vnc flag enables noVNC for live interactive browser access
#
# The agent will:
#   1. Start Xvfb (virtual display)
#   2. Launch real Chrome with CDP on the virtual display
#   3. Mark the VM as "online" in Firestore
#   4. Heartbeat every 15 s
#   5. Auto-pick up URLs from the web UI → open Chrome tabs
#   6. Stream screenshots via CDP every 60 s
#   7. (if --vnc) Expose live browser at http://<IP>:6080/vnc.html
# ══════════════════════════════════════════════════════════════════════════════

set -e

VM_ID="${1:?Usage: ./setup-vm.sh <VM_ID> [--vnc]}"
ENABLE_VNC="${2:-}"  # pass --vnc as second arg to enable live-view

echo "═══ SocialPlug Agent v2 Setup ═══"
echo "  VM ID : $VM_ID"
echo "  Arch  : $(dpkg --print-architecture)"
echo "  VNC   : ${ENABLE_VNC:-disabled}"
echo ""

# ── System dependencies ────────────────────────────────────────────────────────
sudo apt-get update && sudo apt-get upgrade -y

# Core packages: virtual display, VNC, fonts, tools
sudo apt-get install -y \
    python3 python3-pip python3-venv \
    xvfb \
    xdotool \
    fonts-liberation fonts-noto-color-emoji \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    xdg-utils wget curl ca-certificates

# VNC packages (for optional live interactive access)
sudo apt-get install -y x11vnc novnc websockify || true

# ── Install Chrome / Chromium ──────────────────────────────────────────────────
ARCH=$(dpkg --print-architecture)
if [ "$ARCH" = "amd64" ]; then
    echo "[SETUP] Installing Google Chrome (x86_64) …"
    wget -q -O /tmp/chrome.deb \
        https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    sudo dpkg -i /tmp/chrome.deb || sudo apt-get install -f -y
    rm -f /tmp/chrome.deb
    CHROME_BIN=$(which google-chrome-stable || which google-chrome)
else
    echo "[SETUP] Installing Chromium (ARM64) …"
    sudo apt-get install -y chromium-browser || sudo snap install chromium
    CHROME_BIN=$(which chromium-browser || which chromium || echo "/snap/bin/chromium")
fi

echo "[SETUP] Browser: $CHROME_BIN"
$CHROME_BIN --version || true

# ── Agent directory ────────────────────────────────────────────────────────────
AGENT_DIR="$HOME/socialplug-agent"
mkdir -p "$AGENT_DIR"
cd "$AGENT_DIR"

# Copy files (assumes repo was cloned to ~/SocialPlug or files were scp'd)
for f in agent.py requirements.txt; do
    [ -f "$f" ] || cp "$HOME/SocialPlug/vm-agent/$f" . 2>/dev/null || true
done

# ── Python venv ────────────────────────────────────────────────────────────────
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# ── Systemd service ────────────────────────────────────────────────────────────
VNC_FLAG=""
if [ "$ENABLE_VNC" = "--vnc" ]; then
    VNC_FLAG="--vnc"
fi

SERVICE_FILE=/etc/systemd/system/socialplug-agent.service
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=SocialPlug VM Agent v2 — by Illy Robotic Instruments
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$AGENT_DIR
ExecStart=$AGENT_DIR/venv/bin/python agent.py --vm-id $VM_ID $VNC_FLAG
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable socialplug-agent
sudo systemctl start  socialplug-agent

echo ""
echo "═══ Setup Complete ═══"
echo ""
echo "The agent is now running with REAL Chrome and will start automatically on boot."
echo ""
echo "Check status:  sudo systemctl status socialplug-agent"
echo "View logs:     journalctl -u socialplug-agent -f"
if [ "$ENABLE_VNC" = "--vnc" ]; then
echo ""
echo "Live browser:  http://<VM_IP>:6080/vnc.html"
fi
echo ""
echo "IMPORTANT: Make sure firebase-credentials.json is in $AGENT_DIR"
