import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase project: livepay-petition
const firebaseConfig = {
  apiKey: "AIzaSyAPDuRborL8nacI7j6aFGDUFopn_C9kN_A",
  authDomain: "livepay-petition.firebaseapp.com",
  projectId: "livepay-petition",
  storageBucket: "livepay-petition.firebasestorage.app",
  messagingSenderId: "962896076422",
  appId: "1:962896076422:web:35db5ad1acba6501d3fb07",
  measurementId: "G-8JYF50F7R8",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
