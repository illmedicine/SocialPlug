# SocialPlug — Android Release Build Guide

The signed release **Android App Bundle (AAB)** is built and ready to upload
to Google Play Console.

## Output

```
android\app\build\outputs\bundle\release\app-release.aab
```

Size: ~5.7 MB. Signed with the upload key in `android/keystore/socialplug-upload.jks`.

## Upload-key fingerprints (record these for Firebase + Play Console)

```
SHA1   : 7D:4F:34:1F:73:4C:32:B6:8C:69:7E:89:79:4D:65:D1:08:7C:1E:78
SHA256 : 53:15:9B:98:CB:56:22:5F:50:96:EF:92:D6:80:B9:6C:FF:0B:73:68:
         E4:E5:5E:0D:07:1A:B0:EC:D8:EE:2A:FB
```

These come from the keystore at `android/keystore/socialplug-upload.jks`.
Re-print at any time with:

```powershell
$pwd = (Get-Content android\keystore\KEYSTORE_CREDENTIALS.txt | Select-String 'KEYSTORE_PASSWORD=').ToString().Split('=')[1]
& "$env:JAVA_HOME\bin\keytool.exe" -list -v -keystore android\keystore\socialplug-upload.jks -alias socialplug-upload -storepass $pwd
```

## ⚠️ Critical: back up the keystore

The keystore + password are stored at:

- `android\keystore\socialplug-upload.jks`
- `android\keystore\KEYSTORE_CREDENTIALS.txt` (plaintext password)
- `android\keystore\keystore.properties` (gradle signing config)

All three are **gitignored**. If you ever lose them you can never publish an
update to the same Play Store listing (you'd be forced to publish a new app
under a new package name). **Copy these three files to at least two backups
right now** — password manager, encrypted drive, OneDrive, etc.

## Before uploading to Play Console — required Firebase setup

The Android app uses the **same Firebase project (`livepay-petition`) as the
web app** — same Firestore, same Storage, same Cloud Functions, same user
accounts. But Google Sign-In needs to recognize the APK's signing certificate:

1. Firebase Console → **Project settings → Your apps → Add app → Android**
   - Package name: `com.illyroboticinstruments.socialplug`
   - Nickname: `SocialPlug Android`
2. Add **both** SHA-1 fingerprints under *SHA certificate fingerprints*:
   - **Upload SHA-1** (above): `7D:4F:34:1F:73:4C:32:B6:8C:69:7E:89:79:4D:65:D1:08:7C:1E:78`
   - **Play App Signing SHA-1**: shown in Play Console → *Setup → App integrity*
     **after** the first upload. Add it as soon as it's available.
3. Download `google-services.json` and place it at `android/app/google-services.json`.
4. Rebuild the AAB (`npm run android:aab`) so the file is bundled.

Without step 2 + 3, Google Sign-In on installed APKs will fail with
`DEVELOPER_ERROR (code 10)`.

## Uploading to Play Console

1. Go to [play.google.com/console](https://play.google.com/console) → Create app.
2. App name: `SocialPlug`, default language: English, App or Game: App, Free or Paid: Free.
3. Complete the *App content* questionnaire (privacy policy, ads, content rating, target audience, data safety).
4. **Production → Create new release → Upload** → choose `app-release.aab`.
5. Roll out to internal testing first, then production.

Play App Signing is enabled by default — Google will manage the final signing key
and your `socialplug-upload.jks` becomes the "upload key" only. That's good:
if your upload key is ever compromised, Google can reset it for you.

## Rebuilding the AAB after code changes

```powershell
npm run android:aab
```

This:
1. Runs `vite build` with `CAPACITOR=1` (relative paths, no GH-Pages basename)
2. Runs `cap sync android` (copies `dist/` into `android/app/src/main/assets/public`)
3. Runs `gradlew bundleRelease` (produces signed AAB)

Bump `versionCode` and `versionName` in `android/app/build.gradle` for each
Play Store release (Google requires `versionCode` to strictly increase).

## Building a debug APK to test on your phone

```powershell
cd android
.\gradlew.bat assembleDebug
```

Output: `android\app\build\outputs\apk\debug\app-debug.apk` — sideload it
via `adb install` or transfer to your phone.

## How backend sharing works (no extra setup)

- **Auth**: Native Google Sign-In via `@capacitor-firebase/authentication`
  returns a Google ID token. `src/auth/platformAuth.js` forwards it to the
  Firebase Web SDK via `signInWithCredential(auth, credential)`. End result:
  identical `firebase/auth` `User` object as on web → same UID → same user
  document at `users/{uid}`.
- **Firestore / Storage / Cloud Functions**: all accessed through the
  Firebase Web SDK from `src/firebase.js`. Zero Android-specific code needed.
  Whatever you see on web you see on Android, instantly synced.
- **Routing**: `src/main.jsx` auto-switches to `HashRouter` inside the native
  shell so deep-linking and refresh work without a server-side rewriter.
