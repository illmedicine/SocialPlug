import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook: all VMs belonging to the current user (top-level, no environment nesting).
 */
export function useVMs() {
  const { user } = useAuth();
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(
      collection(db, 'vms'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVMs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const updateVM = async (id, data) => {
    return updateDoc(doc(db, 'vms', id), data);
  };

  const deleteVM = async (id) => {
    return deleteDoc(doc(db, 'vms', id));
  };

  return { vms, loading, updateVM, deleteVM };
}

/**
 * Hook: sessions for a specific VM.
 */
export function useSessions(vmId) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !vmId) { setLoading(false); return; }
    const q = query(
      collection(db, 'sessions'),
      where('vmId', '==', vmId),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user, vmId]);

  const addSession = async (url, platform = null) => {
    return addDoc(collection(db, 'sessions'), {
      url,
      vmId,
      userId: user.uid,
      platform: platform || null,
      status: 'pending',
      latestScreenshot: null,
      screenshotUpdatedAt: null,
      createdAt: serverTimestamp(),
    });
  };

  const updateSession = async (id, data) => {
    return updateDoc(doc(db, 'sessions', id), data);
  };

  const stopSession = async (id) => {
    return updateDoc(doc(db, 'sessions', id), { status: 'stopping' });
  };

  const deleteSession = async (id) => {
    return deleteDoc(doc(db, 'sessions', id));
  };

  return { sessions, loading, addSession, updateSession, stopSession, deleteSession };
}

/**
 * Hook: all active sessions across all VMs for current user.
 */
export function useAllSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      where('status', 'in', ['running', 'pending']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { sessions, loading };
}