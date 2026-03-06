import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Firestore doc path must have even segments: users/{uid}/bookmarks/main (4 segments)
  const docRef = user ? doc(db, 'users', user.uid, 'bookmarks', 'main') : null;

  useEffect(() => {
    if (!docRef) {
      setBookmarkIds(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    getDoc(docRef)
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data();
        const ids = Array.isArray(data?.questionIds) ? data.questionIds : [];
        setBookmarkIds(new Set(ids));
      })
      .catch((err) => {
        if (!cancelled) setBookmarkIds(new Set());
        console.error('[Bookmarks] Firestore load failed:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const toggleBookmark = useCallback(
    async (questionId: string) => {
      if (!user || !docRef) return;
      const next = new Set(bookmarkIds);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      setBookmarkIds(next);
      try {
        await setDoc(docRef, { questionIds: Array.from(next) }, { merge: true });
      } catch (err) {
        console.error('[Bookmarks] Firestore save failed:', err);
        setBookmarkIds(bookmarkIds);
      }
    },
    [user, docRef, bookmarkIds]
  );

  const isBookmarked = useCallback(
    (questionId: string) => bookmarkIds.has(questionId),
    [bookmarkIds]
  );

  return { bookmarkIds: Array.from(bookmarkIds), isBookmarked, toggleBookmark, loading };
}
