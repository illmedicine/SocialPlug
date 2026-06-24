/**
 * Platform-aware Google Sign-In.
 * - Web: signInWithPopup (existing behavior, unchanged).
 * - Native (Capacitor / Android): @capacitor-firebase/authentication
 *   performs native Google Sign-In and forwards the credential to the
 *   Firebase Web SDK so the rest of the app (Firestore, Storage,
 *   Functions, AuthContext) keeps working unchanged.
 *
 * IMPORTANT: Capacitor packages are only loaded when running inside a
 * native shell (detected via window.Capacitor, which Capacitor injects
 * at runtime). On web, this file never imports them, so a missing
 * Capacitor install does not break the web sign-in flow.
 */
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

// Always show the account chooser instead of silently picking the last user.
googleProvider.setCustomParameters({ prompt: 'select_account' });

function isNativeShell() {
  return (
    typeof window !== 'undefined' &&
    !!window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );
}

async function getNativeFirebaseAuth() {
  if (!isNativeShell()) return null;
  try {
    /* @vite-ignore */
    const mod = await import('@capacitor-firebase/authentication');
    return mod.FirebaseAuthentication;
  } catch (err) {
    console.warn('[platformAuth] native Firebase auth plugin not available, falling back to web popup', err);
    return null;
  }
}

export async function signInWithGoogle() {
  const native = await getNativeFirebaseAuth();
  if (native) {
    const result = await native.signInWithGoogle();
    const idToken = result?.credential?.idToken;
    if (!idToken) throw new Error('Native Google sign-in returned no idToken');
    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(auth, credential);
  }
  // GitHub Pages sets Cross-Origin-Opener-Policy: same-origin, which breaks
  // signInWithPopup (the SDK can't poll window.closed on the popup). Use
  // redirect flow instead — it works reliably regardless of COOP headers.
  await signInWithRedirect(auth, googleProvider);
}

/** Call once on app boot to finish a redirect-based sign-in (no-op otherwise). */
export async function completeRedirectSignIn() {
  try {
    return await getRedirectResult(auth);
  } catch (err) {
    console.error('[platformAuth] redirect sign-in failed', err);
    return null;
  }
}

export async function signOut() {
  const native = await getNativeFirebaseAuth();
  if (native) {
    try { await native.signOut(); } catch {}
  }
  return fbSignOut(auth);
}
