#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# SocialPlug — OCI CLI Provisioning Script (no Terraform needed)
# by Illy Robotic Instruments
#
# Prerequisites:
#   1. OCI CLI installed: https://github.com/oracle/oci-cli
#   2. OCI CLI configured: oci setup config
#   3. SSH key pair exists at ~/.ssh/socialplug_key[.pub]
#
# Usage:
#   bash oci-provision.sh
#
# This script creates:
#   - 1 VCN (10.0.0.0/16)
#   - 1 Internet Gateway
#   - 1 Route Table
#   - 1 Security List (SSH + HTTPS + ICMP)
#   - 1 Public Subnet (10.0.0.0/24)
#   - 4 ARM A1.Flex instances (1 OCPU / 6 GB each)
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
# Edit these or set as environment variables before running

COMPARTMENT_ID="${OCI_COMPARTMENT_ID:?Set OCI_COMPARTMENT_ID env var}"
REGION="${OCI_REGION:-us-ashburn-1}"
SSH_PUB_KEY_FILE="${SSH_PUBLIC_KEY:-$HOME/.ssh/socialplug_key.pub}"
VM_COUNT=4
FIREBASE_BUCKET="livepay-petition.firebasestorage.app"

echo "═══ SocialPlug OCI Provisioning ═══"
echo "  Compartment: $COMPARTMENT_ID"
echo "  Region:      $REGION"
echo "  VMs:         $VM_COUNT"
echo ""

# ── Helper ────────────────────────────────────────────────────────────────────
get_ad() {
  oci iam availability-domain list \
    --compartment-id "$COMPARTMENT_ID" \
    --query 'data[0].name' --raw-output
}

# ── Get Availability Domain ───────────────────────────────────────────────────
echo "[1/7] Finding availability domain..."
AD=$(get_ad)
echo "  → $AD"

# ── Get Ubuntu 22.04 ARM Image ───────────────────────────────────────────────
echo "[2/7] Finding Ubuntu 22.04 ARM image..."
IMAGE_ID=$(oci compute image list \
  --compartment-id "$COMPARTMENT_ID" \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "22.04" \
  --shape "VM.Standard.A1.Flex" \
  --sort-by TIMECREATED --sort-order DESC \
  --query 'data[0].id' --raw-output)
echo "  → $IMAGE_ID"

# ── Create VCN ────────────────────────────────────────────────────────────────
echo "[3/7] Creating VCN..."
VCN_ID=$(oci network vcn create \
  --compartment-id "$COMPARTMENT_ID" \
  --cidr-blocks '["10.0.0.0/16"]' \
  --display-name "socialplug-vcn" \
  --query 'data.id' --raw-output \
  --wait-for-state AVAILABLE)
echo "  → VCN: $VCN_ID"

# ── Internet Gateway ─────────────────────────────────────────────────────────
echo "[4/7] Creating Internet Gateway + Route Table..."
IGW_ID=$(oci network internet-gateway create \
  --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" \
  --display-name "socialplug-igw" \
  --is-enabled true \
  --query 'data.id' --raw-output \
  --wait-for-state AVAILABLE)

RT_ID=$(oci network route-table create \
  --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" \
  --display-name "socialplug-rt" \
  --route-rules "[{\"destination\":\"0.0.0.0/0\",\"networkEntityId\":\"$IGW_ID\"}]" \
  --query 'data.id' --raw-output \
  --wait-for-state AVAILABLE)

# ── Security List ─────────────────────────────────────────────────────────────
echo "[5/7] Creating Security List..."
SL_ID=$(oci network security-list create \
  --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" \
  --display-name "socialplug-sl" \
  --egress-security-rules '[{"protocol":"all","destination":"0.0.0.0/0","isStateless":false}]' \
  --ingress-security-rules '[
    {"protocol":"6","source":"0.0.0.0/0","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
    {"protocol":"6","source":"0.0.0.0/0","isStateless":false,"tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
    {"protocol":"1","source":"0.0.0.0/0","isStateless":false}
  ]' \
  --query 'data.id' --raw-output \
  --wait-for-state AVAILABLE)

# ── Subnet ────────────────────────────────────────────────────────────────────
echo "[6/7] Creating Public Subnet..."
SUBNET_ID=$(oci network subnet create \
  --compartment-id "$COMPARTMENT_ID" \
  --vcn-id "$VCN_ID" \
  --cidr-block "10.0.0.0/24" \
  --display-name "socialplug-subnet" \
  --route-table-id "$RT_ID" \
  --security-list-ids "[\"$SL_ID\"]" \
  --query 'data.id' --raw-output \
  --wait-for-state AVAILABLE)

# ── Read cloud-init ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Create VMs ────────────────────────────────────────────────────────────────
echo "[7/7] Creating $VM_COUNT VMs..."
SSH_KEY=$(cat "$SSH_PUB_KEY_FILE")

for i in $(seq 1 $VM_COUNT); do
  VM_NAME="socialplug-vm-$i"
  VM_ID="VM-$i"
  echo "  Creating $VM_NAME..."

  # Generate cloud-init for this VM
  CLOUD_INIT=$(cat <<EOCLOUDINIT
#!/bin/bash
set -e
apt-get update && apt-get upgrade -y
apt-get install -y python3 python3-pip python3-venv git \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
  fonts-liberation xdg-utils

sudo -u ubuntu bash -c '
cd /home/ubuntu
git clone https://github.com/illmedicine/SocialPlug.git || true
mkdir -p socialplug-agent
cp SocialPlug/vm-agent/agent.py socialplug-agent/
cp SocialPlug/vm-agent/requirements.txt socialplug-agent/
cd socialplug-agent
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m playwright install chromium
python -m playwright install-deps chromium
'

cat > /etc/systemd/system/socialplug-agent.service <<EOF
[Unit]
Description=SocialPlug VM Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/socialplug-agent
ExecStart=/home/ubuntu/socialplug-agent/venv/bin/python agent.py --vm-id $VM_ID --bucket $FIREBASE_BUCKET
Restart=always
RestartSec=10
Environment=DISPLAY=:0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable socialplug-agent
systemctl start socialplug-agent

# Anti-idle cron
echo '*/10 * * * * dd if=/dev/urandom bs=512K count=20 of=/dev/null 2>/dev/null' | crontab -u ubuntu -
EOCLOUDINIT
  )

  CLOUD_INIT_B64=$(echo "$CLOUD_INIT" | base64 -w 0)

  INSTANCE_ID=$(oci compute instance launch \
    --compartment-id "$COMPARTMENT_ID" \
    --availability-domain "$AD" \
    --display-name "$VM_NAME" \
    --shape "VM.Standard.A1.Flex" \
    --shape-config '{"ocpus":1,"memoryInGBs":6}' \
    --image-id "$IMAGE_ID" \
    --subnet-id "$SUBNET_ID" \
    --assign-public-ip true \
    --metadata "{\"ssh_authorized_keys\":\"$SSH_KEY\",\"user_data\":\"$CLOUD_INIT_B64\"}" \
    --query 'data.id' --raw-output)

  echo "  → $VM_NAME launched: $INSTANCE_ID"
done

echo ""
echo "═══ Provisioning Complete ═══"
echo ""
echo "VMs are booting and installing the SocialPlug agent."
echo "They will appear in your dashboard within ~5 minutes."
echo ""
echo "To check status:"
echo "  oci compute instance list --compartment-id $COMPARTMENT_ID --display-name socialplug --query 'data[*].{name:\"display-name\",state:\"lifecycle-state\",ip:\"primary-public-ip\"}' --output table"
echo ""
echo "To SSH into a VM:"
echo "  ssh -i ~/.ssh/socialplug_key ubuntu@<PUBLIC_IP>"
