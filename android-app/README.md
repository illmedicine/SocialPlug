# SocialPlug Android App

The Android version of SocialPlug is a **Capacitor**-wrapped build of the same
React + Firebase web application. It uses the **same Firebase project**
(`livepay-petition`), the **same Firestore collections, Storage buckets,
Cloud Functions, and Google Sign-In** as the web app, so user settings,
profiles, VM lists, workflows, and sessions all sync identically across
platforms.

## Architecture

```
┌──────────────────────────────────────────────┐
│  Android APK (Capacitor shell)               │
│  ┌────────────────────────────────────────┐  │
│  │  WebView running the React/Vite build  │  │
│  │  (identical UI to the web app)         │  │
│  └────────────────────────────────────────┘  │
│           │                  │               │
│   Native Google         Firebase Web SDK     │
│   Sign-In plugin   →    (Auth, Firestore,    │
│   (@capacitor-           Storage, Functions) │
│   firebase/auth)                             │
└──────────────────────────────────────────────┘
                        │
                        ▼
              Firebase project: livepay-petition
              (shared backend with web app)
```

## One-time setup

```powershell
# 1) Install JS deps (adds Capacitor + native sign-in plugin)
npm install

# 2) Drop your master 1024x1024 PNG of the SocialPlug shield logo here:
#    assets/logo.png   (and optionally logo-foreground.png + splash.png)

# 3) Generate the Android Studio project
npm run android:init

# 4) Build the web bundle for the wrapper, copy it into the Android project,
#    and generate icons + splash from assets/logo.png
npm run android:sync
npm run android:icons
```

### Firebase Android configuration

1. In the Firebase console, open **Project settings → Your apps → Add Android app**.
2. Use package name `com.illyroboticinstruments.socialplug`
   (this matches `appId` in [capacitor.config.json](../capacitor.config.json)).
3. Add your release & debug **SHA-1 / SHA-256** fingerprints
   (required for Google Sign-In).
4. Download `google-services.json` and place it at:

   ```
   android/app/google-services.json
   ```

5. Make sure **Google** is enabled under
   **Authentication → Sign-in method**.

The `@capacitor-firebase/authentication` plugin auto-applies the
Google Services Gradle plugin during `cap sync`.

## Building / running

```powershell
# Open Android Studio
npm run android:open

# Or build & run on a connected device / emulator:
npm run android:run
```

To produce a release APK / AAB, use Android Studio
(**Build → Generate Signed Bundle / APK**) on the generated `android/` folder.

## Updating the app

Anytime the React code changes:

```powershell
npm run android:sync
```

This rebuilds the web bundle (with `CAPACITOR=1` so paths are relative and
the GH-Pages basename is removed) and copies it into the Android project.

## How sign-in & data sharing work

- `src/auth/platformAuth.js` detects whether the app is running natively.
  - **Web:** `signInWithPopup(auth, googleProvider)` — unchanged.
  - **Android:** native Google Sign-In via `@capacitor-firebase/authentication`,
    then forwards the resulting Google ID token into the Firebase Web SDK
    via `signInWithCredential`. The end result is the same `firebase/auth`
    `User` object the rest of the app already uses.
- `AuthContext.jsx` is unchanged downstream of the sign-in call, so:
  - User profile docs (`users/{uid}`) are read/written the same way.
  - VM seeding, workflows, settings, screenshots — all share Firestore.
  - Cloud Functions (`startVM`, `stopVM`, `sendAgentCommand`, …) are callable
    from Android via the Firebase Web SDK exactly as on web.

## Routing

`src/main.jsx` automatically switches to `HashRouter` when running inside
Capacitor (no GitHub Pages basename), and stays on `BrowserRouter` with
`basename="/SocialPlug"` in the browser. No code changes are required in
individual pages.
