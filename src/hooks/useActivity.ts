import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useActivity() {
  const { user } = useAuth();
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const markDone = useCallback(
    async (questionId: string, date?: string) => {
      if (!user) return;
      try {
        const d = date ?? todayStr();
        const ref = doc(db, 'users', user.uid, 'activity', d);
        const snap = await getDoc(ref);
        const data = snap.data();
        const questionIds = Array.isArray(data?.questionIds) ? [...data.questionIds] : [];
        if (questionIds.includes(questionId)) return;
        questionIds.push(questionId);
        await setDoc(ref, { questionIds, count: questionIds.length }, { merge: true });
        setSolvedSet((prev) => new Set(prev).add(questionId));
      } catch (err) {
        console.error('[Activity] Firestore markDone failed:', err);
      }
    },
    [user]
  );

  const unmarkDone = useCallback(
    async (questionId: string) => {
      if (!user) return;
      const d = todayStr();
      const ref = doc(db, 'users', user.uid, 'activity', d);
      try {
        const snap = await getDoc(ref);
        const data = snap.data();
        const questionIds = Array.isArray(data?.questionIds) ? data.questionIds.filter((id: string) => id !== questionId) : [];
        if (questionIds.length === (data?.questionIds?.length ?? 0)) return;
        if (questionIds.length === 0) {
          await setDoc(ref, { questionIds: [], count: 0 }, { merge: true });
        } else {
          await setDoc(ref, { questionIds, count: questionIds.length }, { merge: true });
        }
        setSolvedSet((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
      } catch (err) {
        console.error('[Activity] Firestore unmarkDone failed:', err);
      }
    },
    [user]
  );

  const isSolved = useCallback(
    (questionId: string) => solvedSet.has(questionId),
    [solvedSet]
  );

  useEffect(() => {
    if (!user) {
      setSolvedSet(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    getDocs(collection(db, 'users', user.uid, 'activity'))
      .then((snap) => {
        if (cancelled) return;
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          const arr = d.data()?.questionIds;
          if (Array.isArray(arr)) arr.forEach((id: string) => ids.add(id));
        });
        setSolvedSet(ids);
      })
      .catch((err) => {
        console.error('[Activity] Firestore load failed:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return { markDone, unmarkDone, isSolved, solvedIds: Array.from(solvedSet), loading };
}

export function useActivityHeatmap() {
  const { user } = useAuth();
  const [days, setDays] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) {
      setDays({});
      return;
    }
    let cancelled = false;
    getDocs(collection(db, 'users', user.uid, 'activity'))
      .then((snap) => {
        if (cancelled) return;
        const out: Record<string, number> = {};
        snap.docs.forEach((d) => {
          const count = Number(d.data()?.count) ?? 0;
          out[d.id] = count;
        });
        setDays(out);
      })
      .catch((err) => {
        if (!cancelled) setDays({});
        console.error('[Activity] Heatmap load failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return days;
}

export function useRecentActivity(limitCount: number = 30) {
  const { user } = useAuth();
  const [recent, setRecent] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    if (!user) {
      setRecent([]);
      return;
    }
    getDocs(collection(db, 'users', user.uid, 'activity'))
      .then((snap) => {
        const list = snap.docs
          .map((d) => ({ date: d.id, count: Number(d.data()?.count) || 0 }))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limitCount);
        setRecent(list);
      })
      .catch(() => setRecent([]));
  }, [user?.uid, limitCount]);

  return recent;
}
