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
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook: workflows for a specific platform belonging to the current user.
 */
export function useWorkflows(platformKey) {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !platformKey) { setLoading(false); return; }
    const q = query(
      collection(db, 'workflows'),
      where('userId', '==', user.uid),
      where('platform', '==', platformKey)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setWorkflows(docs);
      setLoading(false);
    }, (err) => {
      console.warn('Workflows query error:', err.message);
      setLoading(false);
    });
    return unsubscribe;
  }, [user, platformKey]);

  const createWorkflow = async (name, accountHandle = '') => {
    const docRef = await addDoc(collection(db, 'workflows'), {
      name,
      platform: platformKey,
      accountHandle,
      userId: user.uid,
      status: 'inactive',
      nodes: [],
      connections: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  };

  const updateWorkflow = async (id, data) => {
    return updateDoc(doc(db, 'workflows', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteWorkflow = async (id) => {
    return deleteDoc(doc(db, 'workflows', id));
  };

  return { workflows, loading, createWorkflow, updateWorkflow, deleteWorkflow };
}
