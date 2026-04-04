# Echo Vue — Cloud VM Management Portal

> by Illy Robotics

A static-hosted management portal for running Chrome browser sessions across multiple cloud VMs with live screenshot monitoring. Frontend deployed to GitHub Pages, backend powered by Firebase (free tier), VMs on Oracle Cloud Always Free Tier.

---

## Architecture

```
┌──────────────────────┐      ┌─────────────────────┐
│   GitHub Pages       │      │   Firebase           │
│   (React SPA)        │◄────►│   - Auth (Google)    │
│                      │      │   - Firestore (DB)   │
│   • Login            │      │   - Storage (images) │
│   • Manage VMs       │      └──────────┬──────────┘
│   • Launch URLs      │                 │
│   • View Screenshots │                 │ Firestore listeners
│                      │                 │
└──────────────────────┘      ┌──────────▼──────────┐
                              │  Oracle Cloud VMs    │
                              │  (Always Free Tier)  │
                              │                      │
                              │  VM Agent (Python)   │
                              │  • Playwright/Chrome │
                              │  • Screenshot every  │
                              │    60s → Storage     │
                              │  • Unique public IP  │
                              └──────────────────────┘
```

## Cost Breakdown

| Service | Free Tier Limits | Cost |
|---------|-----------------|------|
| GitHub Pages | Unlimited static hosting | $0 |
| Firebase Auth | 10K auth/month | $0 |
| Firestore | 1GB storage, 50K reads/day | $0 |
| Firebase Storage | 5GB, 1GB/day download | $0 |
| Oracle Cloud VMs | 4 ARM VMs, 24GB RAM, 200GB disk | $0 |
| **Total** | | **$0/month** |

---

## Quick Start

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Google sign-in
4. Enable **Cloud Firestore** (start in test mode, then apply rules)
5. Enable **Storage**
6. Get your web app config from Project Settings
7. Create a `.env` file:

```env
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000:web:000
```

### 2. Frontend Development

```bash
npm install
npm run dev          # Local dev server on http://localhost:5173
npm run build        # Build for production
```

### 3. Deploy to GitHub Pages

Push to `main` branch — the GitHub Actions workflow auto-deploys to Pages.

Or manually:
```bash
npm run deploy
```

### 4. Oracle Cloud VM Setup

1. Sign up at [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Create an **Ampere A1** (ARM) instance:
   - Shape: VM.Standard.A1.Flex (1 OCPU, 6GB RAM per VM)
   - OS: Ubuntu 22.04 (Canonical)
   - You get up to **4 VMs** for free
3. Each VM gets a unique public IP automatically
4. SSH into each VM and run:

```bash
# Upload these files to the VM:
#   - vm-agent/agent.py
#   - vm-agent/requirements.txt
#   - vm-agent/setup-vm.sh
#   - firebase-credentials.json (from Firebase Console → Service Accounts)

chmod +x setup-vm.sh
./setup-vm.sh

# Start the agent
source venv/bin/activate
python agent.py --vm-id YOUR_VM_DOC_ID --bucket your-project.appspot.com
```

5. **For auto-start on reboot**, install the systemd service:

```bash
sudo cp echo-vue-agent.service /etc/systemd/system/
# Edit the service file to set your VM ID and bucket
sudo systemctl daemon-reload
sudo systemctl enable echo-vue-agent
sudo systemctl start echo-vue-agent
```

### 5. Firestore Security Rules

Deploy the included `firestore.rules` and `storage.rules` to your Firebase project.

---

## How It Works

1. **Admin signs in** via Google OAuth on the GitHub Pages frontend
2. **Creates an Environment** (logical grouping, e.g. "Office", "Lab")
3. **Adds VM Rooms** — registers each Oracle Cloud VM with its public IP
4. **Enters a URL** and clicks Launch → creates a Firestore `session` document
5. **VM Agent** polls Firestore, sees the pending session, launches Chrome with Playwright
6. **Every 60 seconds**, the agent screenshots the page and uploads to Firebase Storage
7. **Frontend** receives real-time Firestore updates and displays the latest screenshot
8. **Cameras page** shows a grid of all live sessions across all VMs

---

## Project Structure

```
SocialPlug/
├── src/
│   ├── main.jsx                 # App entry point
│   ├── App.jsx                  # Routes and auth wrapper
│   ├── firebase.js              # Firebase initialization
│   ├── index.css                # Global styles (Tailwind)
│   ├── contexts/
│   │   └── AuthContext.jsx      # Google OAuth provider
│   ├── hooks/
│   │   └── useFirestore.js      # Firestore CRUD hooks
│   ├── components/
│   │   ├── DashboardLayout.jsx  # Sidebar + main layout
│   │   ├── PlatformLogos.jsx    # Social media SVG logos
│   │   └── ScreenshotViewer.jsx # Full-screen live viewer
│   └── pages/
│       ├── LoginPage.jsx
│       ├── DashboardPage.jsx    # VM dashboard with on/off toggles
│       ├── VMDetailPage.jsx     # Session management + screenshots
│       ├── CamerasPage.jsx      # All live sessions grid
│       ├── PlatformPage.jsx     # Per-platform session view
│       └── SettingsPage.jsx     # User profile + config
├── vm-agent/
│   ├── agent.py                 # Python VM agent
│   ├── requirements.txt
│   ├── setup-vm.sh              # Ubuntu VM setup script
│   └── echo-vue-agent.service   # Systemd service file
├── .github/workflows/
│   └── deploy.yml               # Auto-deploy to GitHub Pages
├── firestore.rules              # Firestore security rules
├── storage.rules                # Storage security rules
├── .env.example
└── package.json
```

## Firestore Collections

| Collection | Key Fields |
|-----------|------------|
| `users/{uid}` | displayName, email, settings |
| `environments/{id}` | name, icon, userId |
| `vms/{id}` | name, publicIP, provider, status, environmentId, userId, agentKey |
| `sessions/{id}` | url, vmId, userId, status, latestScreenshot, screenshotUpdatedAt |
