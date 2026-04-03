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

export function useEnvironments() {
  const { user } = useAuth();
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'environments'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEnvironments(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const addEnvironment = async (name, icon = '🏢') => {
    return addDoc(collection(db, 'environments'), {
      name,
      icon,
      userId: user.uid,
      createdAt: serverTimestamp(),
    });
  };

  const deleteEnvironment = async (id) => {
    return deleteDoc(doc(db, 'environments', id));
  };

  return { environments, loading, addEnvironment, deleteEnvironment };
}

export function useVMs(environmentId) {
  const { user } = useAuth();
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !environmentId) { setLoading(false); return; }
    const q = query(
      collection(db, 'vms'),
      where('environmentId', '==', environmentId),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVMs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user, environmentId]);

  const addVM = async (data) => {
    return addDoc(collection(db, 'vms'), {
      ...data,
      environmentId,
      userId: user.uid,
      status: 'offline',
      publicIP: data.publicIP || '',
      agentKey: crypto.randomUUID(),
      createdAt: serverTimestamp(),
    });
  };

  const updateVM = async (id, data) => {
    return updateDoc(doc(db, 'vms', id), data);
  };

  const deleteVM = async (id) => {
    return deleteDoc(doc(db, 'vms', id));
  };

  return { vms, loading, addVM, updateVM, deleteVM };
}

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

  const addSession = async (url) => {
    return addDoc(collection(db, 'sessions'), {
      url,
      vmId,
      userId: user.uid,
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
