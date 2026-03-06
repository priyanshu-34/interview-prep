import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

/** Firestore document IDs cannot contain /. Use a safe id for the path. */
function toNoteDocId(questionId: string): string {
  return questionId.replace(/\//g, '__SLASH__');
}
function fromNoteDocId(docId: string): string {
  return docId.replace(/__SLASH__/g, '/');
}

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Record<string, { content: string; updatedAt: string }>>({});
  const [loading, setLoading] = useState(true);

  const loadNote = useCallback(
    async (questionId: string) => {
      if (!user) return null;
      const docId = toNoteDocId(questionId);
      const snap = await getDoc(doc(db, 'users', user.uid, 'notes', docId));
      const d = snap.data();
      return d ? { content: d.content ?? '', updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() ?? '' } : null;
    },
    [user]
  );

  const getNote = useCallback(
    (questionId: string) => notes[questionId] ?? null,
    [notes]
  );

  const setNote = useCallback(
    async (questionId: string, content: string) => {
      if (!user) {
        console.warn('[Notes] Not saved: no user signed in.');
        return;
      }
      const updatedAt = new Date().toISOString();
      setNotes((prev) => ({ ...prev, [questionId]: { content, updatedAt } }));
      try {
        const docId = toNoteDocId(questionId);
        const ref = doc(db, 'users', user.uid, 'notes', docId);
        await setDoc(ref, { content, updatedAt }, { merge: true });
        if (import.meta.env.DEV) console.log('[Notes] Saved:', questionId);
      } catch (err) {
        console.error('[Notes] Firestore save failed:', err);
        setNotes((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
      }
    },
    [user]
  );

  const loadNotesForQuestions = useCallback(
    async (questionIds: string[]) => {
      if (!user || questionIds.length === 0) {
        setLoading(false);
        return;
      }
      const entries = await Promise.all(
        questionIds.map(async (id) => {
          const n = await loadNote(id);
          return n ? [id, n] as const : null;
        })
      );
      const map: Record<string, { content: string; updatedAt: string }> = {};
      entries.forEach((e) => {
        if (e) map[e[0]] = e[1];
      });
      setNotes((prev) => ({ ...prev, ...map }));
      setLoading(false);
    },
    [user?.uid, loadNote]
  );

  const loadAllNotes = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
    const snap = await getDocs(collection(db, 'users', user.uid, 'notes'));
    const map: Record<string, { content: string; updatedAt: string }> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      const questionId = fromNoteDocId(d.id);
      map[questionId] = {
        content: data.content ?? '',
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
      };
    });
    setNotes(map);
    } catch (err) {
      console.error('[Notes] Firestore load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      setNotes({});
      setLoading(false);
    }
  }, [user?.uid]);

  return { notes, getNote, setNote, loadNote, loadNotesForQuestions, loadAllNotes, loading };
}
