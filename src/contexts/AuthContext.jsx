import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const AuthContext = createContext(null);

const DEFAULT_VMS = [
  { name: 'VM-1', specs: 'Azure B2pts v2 · 2 vCPU · 1 GB RAM' },
  { name: 'VM-2', specs: 'Azure B2ats v2 · 2 vCPU · 1 GB RAM' },
];

async function seedVMs(uid) {
  const q = query(collection(db, 'vms'), where('userId', '==', uid));
  const snap = await getDocs(q);
  if (snap.size > 0) return; // already seeded

  for (const vm of DEFAULT_VMS) {
    await addDoc(collection(db, 'vms'), {
      name: vm.name,
      specs: vm.specs,
      userId: uid,
      provider: 'azure',
      status: 'offline',
      activeSessions: 0,
      publicIP: '',
      agentKey: crypto.randomUUID(),
      createdAt: serverTimestamp(),
      lastSeen: null,
    });
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        } else {
          const newProfile = {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            createdAt: serverTimestamp(),
            settings: {
              screenshotInterval: 60,
              maxTabsPerVM: 10,
              theme: 'light',
            },
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }
        // Auto-seed 4 VMs on first login
        await seedVMs(firebaseUser.uid);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = () => signInWithPopup(auth, googleProvider);
  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
