import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface UserPrefs {
  markForRevision: string[];
  dailyGoal: number;
  weeklyGoal: number;
}

const DEFAULT_PREFS: UserPrefs = {
  markForRevision: [],
  dailyGoal: 0,
  weeklyGoal: 0,
};

export function usePrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULT_PREFS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid, 'prefs', 'main'))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data();
        setPrefs({
          markForRevision: Array.isArray(data?.markForRevision) ? data.markForRevision : [],
          dailyGoal: typeof data?.dailyGoal === 'number' ? data.dailyGoal : 0,
          weeklyGoal: typeof data?.weeklyGoal === 'number' ? data.weeklyGoal : 0,
        });
      })
      .catch(() => setPrefs(DEFAULT_PREFS))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const updatePrefs = useCallback(
    async (updates: Partial<UserPrefs>) => {
      if (!user) return;
      const next = { ...prefs, ...updates };
      setPrefs(next);
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'prefs', 'main'),
          { markForRevision: next.markForRevision, dailyGoal: next.dailyGoal, weeklyGoal: next.weeklyGoal },
          { merge: true }
        );
      } catch (err) {
        console.error('[Prefs] Save failed:', err);
        setPrefs(prefs);
      }
    },
    [user, prefs]
  );

  const toggleMarkForRevision = useCallback(
    async (questionId: string) => {
      const set = new Set(prefs.markForRevision);
      if (set.has(questionId)) set.delete(questionId);
      else set.add(questionId);
      await updatePrefs({ markForRevision: Array.from(set) });
    },
    [prefs.markForRevision, updatePrefs]
  );

  const isMarkedForRevision = useCallback(
    (questionId: string) => prefs.markForRevision.includes(questionId),
    [prefs.markForRevision]
  );

  return {
    prefs,
    loading,
    updatePrefs,
    toggleMarkForRevision,
    isMarkedForRevision,
  };
}
