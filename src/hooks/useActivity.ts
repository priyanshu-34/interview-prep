import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeStreaks(activityDates: string[]): { currentStreak: number; longestStreak: number } {
  const set = new Set(activityDates);
  if (set.size === 0) return { currentStreak: 0, longestStreak: 0 };
  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (set.has(dateStr)) currentStreak++;
    else break;
  }
  const sorted = [...set].sort((a, b) => a.localeCompare(b));
  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [py, pm, pd] = sorted[i - 1].split('-').map(Number);
    const [cy, cm, cd] = sorted[i].split('-').map(Number);
    const prev = new Date(py, pm - 1, pd).getTime();
    const curr = new Date(cy, cm - 1, cd).getTime();
    if ((curr - prev) / (24 * 60 * 60 * 1000) === 1) run++;
    else run = 1;
    longestStreak = Math.max(longestStreak, run);
  }
  return { currentStreak, longestStreak };
}

async function updateCachedStats(
  db: import('firebase/firestore').Firestore,
  uid: string,
  totalSolved: number,
  activityDocs: { id: string; count: number }[]
) {
  const dates = activityDocs.filter((d) => d.count > 0).map((d) => d.id);
  const { currentStreak, longestStreak } = computeStreaks(dates);
  const lastActivityDate = dates.length > 0 ? dates.sort()[dates.length - 1] : null;
  const ref = doc(db, 'users', uid, 'stats', 'main');
  await setDoc(ref, { totalSolved, currentStreak, longestStreak, lastActivityDate }, { merge: true });
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
        const activitySnap = await getDocs(collection(db, 'users', user.uid, 'activity'));
        const docs = activitySnap.docs.map((d) => ({ id: d.id, count: Number(d.data()?.count) || 0 }));
        const allIds = new Set<string>();
        activitySnap.docs.forEach((d) => {
          (d.data()?.questionIds ?? []).forEach((id: string) => allIds.add(id));
        });
        await updateCachedStats(db, user.uid, allIds.size, docs);
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
        const activitySnap = await getDocs(collection(db, 'users', user.uid, 'activity'));
        const ids = new Set<string>();
        activitySnap.docs.forEach((docSnap) => {
          const arr = docSnap.data()?.questionIds;
          if (Array.isArray(arr)) arr.forEach((id: string) => ids.add(id));
        });
        setSolvedSet(ids);
        const docs = activitySnap.docs.map((d) => ({ id: d.id, count: Number(d.data()?.count) || 0 }));
        await updateCachedStats(db, user.uid, ids.size, docs);
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
      .then(async (snap) => {
        if (cancelled) return;
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          const arr = d.data()?.questionIds;
          if (Array.isArray(arr)) arr.forEach((id: string) => ids.add(id));
        });
        setSolvedSet(ids);
        const docs = snap.docs.map((d) => ({ id: d.id, count: Number(d.data()?.count) || 0 }));
        try {
          await updateCachedStats(db, user!.uid, ids.size, docs);
        } catch {
          // ignore stats write failure on load
        }
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
