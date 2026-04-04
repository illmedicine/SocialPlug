#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# SocialPlug VM Agent — Automated Setup
# by Illy Robotic Instruments
#
# Run this on a fresh Ubuntu 22.04+ ARM instance.
# After setup the agent starts automatically on boot via systemd —
# no manual commands needed. The agent will:
#   1. Install Playwright Chromium if missing
#   2. Launch headless Chrome
#   3. Mark the VM as "online" (ready) in Firestore
#   4. Heartbeat every 15 s so the dashboard knows the VM is alive
#   5. Auto-pick up any URLs you submit from the web UI
#   6. Stream screenshots back to the frontend every 60 s
# ══════════════════════════════════════════════════════════════════════════════

set -e

VM_ID="${1:?Usage: ./setup-vm.sh <VM_ID>}"

echo "═══ SocialPlug Agent Setup ═══"
echo "  VM ID: $VM_ID"
echo ""

# ── System dependencies ────────────────────────────────────────────────────────
sudo apt-get update && sudo apt-get upgrade -y

sudo apt-get install -y python3 python3-pip python3-venv \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    fonts-liberation xdg-utils

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

# Pre-install Playwright Chromium (agent also auto-installs, but this is faster)
python -m playwright install chromium
python -m playwright install-deps chromium

# ── Systemd service ────────────────────────────────────────────────────────────
SERVICE_FILE=/etc/systemd/system/socialplug-agent.service
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=SocialPlug VM Agent — by Illy Robotic Instruments
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$AGENT_DIR
ExecStart=$AGENT_DIR/venv/bin/python agent.py --vm-id $VM_ID --bucket livepay-petition.firebasestorage.app
Restart=always
RestartSec=10
Environment=DISPLAY=:0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable socialplug-agent
sudo systemctl start  socialplug-agent

echo ""
echo "═══ Setup Complete ═══"
echo ""
echo "The agent is now running and will start automatically on boot."
echo "Check status:  sudo systemctl status socialplug-agent"
echo "View logs:     journalctl -u socialplug-agent -f"
echo ""
echo "IMPORTANT: Make sure firebase-credentials.json is in $AGENT_DIR"
