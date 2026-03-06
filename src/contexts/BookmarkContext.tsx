import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface BookmarkContextValue {
  bookmarkIds: string[];
  isBookmarked: (questionId: string) => boolean;
  toggleBookmark: (questionId: string) => Promise<void>;
  loading: boolean;
}

const BookmarkContext = createContext<BookmarkContextValue | null>(null);

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [bookmarkSet, setBookmarkSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBookmarkSet(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    const ref = doc(db, 'users', user.uid, 'bookmarks', 'main');
    getDoc(ref)
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data();
        const ids = Array.isArray(data?.questionIds) ? data.questionIds : [];
        setBookmarkSet(new Set(ids));
      })
      .catch((err) => {
        if (!cancelled) setBookmarkSet(new Set());
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
      if (!user) return;
      const ref = doc(db, 'users', user.uid, 'bookmarks', 'main');
      const next = new Set(bookmarkSet);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      setBookmarkSet(next);
      try {
        await setDoc(ref, { questionIds: Array.from(next) }, { merge: true });
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
        console.error('[Bookmarks] Firestore save failed:', code, err);
        setBookmarkSet((prev) => {
          const revert = new Set(prev);
          if (revert.has(questionId)) revert.delete(questionId);
          else revert.add(questionId);
          return revert;
        });
      }
    },
    [user, bookmarkSet]
  );

  const isBookmarked = useCallback(
    (questionId: string) => bookmarkSet.has(questionId),
    [bookmarkSet]
  );

  const value: BookmarkContextValue = {
    bookmarkIds: Array.from(bookmarkSet),
    isBookmarked,
    toggleBookmark,
    loading,
  };

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}

export function useBookmarkContext() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmarkContext must be used within BookmarkProvider');
  return ctx;
}
