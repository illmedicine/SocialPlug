#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# Echo Vue VM Agent - Oracle Cloud Free Tier Setup Script
# Run this on a fresh Ubuntu 22.04 ARM instance
# ══════════════════════════════════════════════════════════════════════════════

set -e

echo "═══ Echo Vue VM Agent Setup ═══"

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Python 3.11+ and pip
sudo apt-get install -y python3 python3-pip python3-venv

# Install Chromium dependencies
sudo apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    fonts-liberation \
    xdg-utils

# Create working directory
mkdir -p ~/echo-vue-agent
cd ~/echo-vue-agent

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install firebase-admin google-cloud-firestore google-cloud-storage playwright

# Install Playwright browsers
playwright install chromium
playwright install-deps chromium

echo ""
echo "═══ Setup Complete! ═══"
echo ""
echo "Next steps:"
echo "  1. Copy your firebase-credentials.json to ~/echo-vue-agent/"
echo "  2. Copy agent.py to ~/echo-vue-agent/"
echo "  3. Run: source venv/bin/activate"
echo "  4. Run: python agent.py --vm-id YOUR_VM_ID --bucket YOUR_PROJECT.appspot.com"
echo ""
echo "For auto-start on boot, run: sudo systemctl enable echo-vue-agent"
