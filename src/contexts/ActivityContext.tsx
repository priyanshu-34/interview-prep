import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

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
  dbInstance: import('firebase/firestore').Firestore,
  uid: string,
  totalSolved: number,
  activityDocs: { id: string; count: number }[]
) {
  const dates = activityDocs.filter((d) => d.count > 0).map((d) => d.id);
  const { currentStreak, longestStreak } = computeStreaks(dates);
  const lastActivityDate = dates.length > 0 ? dates.sort()[dates.length - 1] : null;
  const ref = doc(dbInstance, 'users', uid, 'stats', 'main');
  await setDoc(ref, { totalSolved, currentStreak, longestStreak, lastActivityDate }, { merge: true });
}

interface ActivityContextValue {
  markDone: (questionId: string, date?: string) => Promise<void>;
  unmarkDone: (questionId: string) => Promise<void>;
  isSolved: (questionId: string) => boolean;
  solvedIds: string[];
  /** Date string (YYYY-MM-DD) -> count for heatmap; from single load, updated optimistically */
  activityDays: Record<string, number>;
  loading: boolean;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [activityDays, setActivityDays] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSolvedSet(new Set());
      setActivityDays({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    getDocs(collection(db, 'users', user.uid, 'activity'))
      .then(async (snap) => {
        if (cancelled) return;
        const ids = new Set<string>();
        const days: Record<string, number> = {};
        snap.docs.forEach((d) => {
          const arr = d.data()?.questionIds;
          if (Array.isArray(arr)) arr.forEach((id: string) => ids.add(id));
          days[d.id] = Number(d.data()?.count) || 0;
        });
        setSolvedSet(ids);
        setActivityDays(days);
        const docs = Object.entries(days).map(([id, count]) => ({ id, count }));
        try {
          await updateCachedStats(db, user.uid, ids.size, docs);
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

  const markDone = useCallback(
    async (questionId: string, date?: string) => {
      if (!user) return;
      const d = date ?? todayStr();
      const ref = doc(db, 'users', user.uid, 'activity', d);
      setSolvedSet((prev) => new Set(prev).add(questionId));
      setActivityDays((prev) => ({ ...prev, [d]: (prev[d] ?? 0) + 1 }));
      try {
        const snap = await getDoc(ref);
        const data = snap.data();
        const questionIds = Array.isArray(data?.questionIds) ? [...data.questionIds] : [];
        if (questionIds.includes(questionId)) return;
        questionIds.push(questionId);
        await setDoc(ref, { questionIds, count: questionIds.length }, { merge: true });
        setActivityDays((prev) => ({ ...prev, [d]: questionIds.length }));
        try {
          const updatedDays = { ...activityDays, [d]: questionIds.length };
          const docs = Object.entries(updatedDays).map(([id, count]) => ({ id, count }));
          await updateCachedStats(db, user.uid, solvedSet.size + 1, docs);
        } catch (statsErr) {
          console.warn('[Activity] Stats update failed (activity was saved):', statsErr);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
        console.error('[Activity] Firestore markDone failed:', msg, code || '', 'Path: users/', user.uid, '/activity/', d);
        setSolvedSet((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
        setActivityDays((prev) => {
          const next = { ...prev };
          const v = (next[d] ?? 0) - 1;
          if (v <= 0) delete next[d];
          else next[d] = v;
          return next;
        });
      }
    },
    [user, activityDays, solvedSet.size]
  );

  const unmarkDone = useCallback(
    async (questionId: string) => {
      if (!user) return;
      const d = todayStr();
      const ref = doc(db, 'users', user.uid, 'activity', d);
      setSolvedSet((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      setActivityDays((prev) => {
        const v = Math.max(0, (prev[d] ?? 0) - 1);
        const next = { ...prev };
        if (v <= 0) delete next[d];
        else next[d] = v;
        return next;
      });
      try {
        const snap = await getDoc(ref);
        const data = snap.data();
        const questionIds = Array.isArray(data?.questionIds) ? data.questionIds.filter((id: string) => id !== questionId) : [];
        if (questionIds.length === (data?.questionIds?.length ?? 0)) {
          setSolvedSet((prev) => new Set(prev).add(questionId));
          setActivityDays((prev) => ({ ...prev, [d]: (prev[d] ?? 0) + 1 }));
          return;
        }
        if (questionIds.length === 0) {
          await setDoc(ref, { questionIds: [], count: 0 }, { merge: true });
          setActivityDays((prev) => {
            const next = { ...prev };
            delete next[d];
            return next;
          });
        } else {
          await setDoc(ref, { questionIds, count: questionIds.length }, { merge: true });
          setActivityDays((prev) => ({ ...prev, [d]: questionIds.length }));
        }
        try {
          const newDays = questionIds.length === 0 ? (() => { const o = { ...activityDays }; delete o[d]; return o; })() : { ...activityDays, [d]: questionIds.length };
          const docs = Object.entries(newDays).map(([id, count]) => ({ id, count }));
          await updateCachedStats(db, user.uid, solvedSet.size - 1, docs);
        } catch (statsErr) {
          console.warn('[Activity] Stats update failed (activity was saved):', statsErr);
        }
      } catch (err) {
        console.error('[Activity] Firestore unmarkDone failed:', err);
        setSolvedSet((prev) => new Set(prev).add(questionId));
        setActivityDays((prev) => ({ ...prev, [d]: (prev[d] ?? 0) + 1 }));
      }
    },
    [user, activityDays, solvedSet.size]
  );

  const isSolved = useCallback(
    (questionId: string) => solvedSet.has(questionId),
    [solvedSet]
  );

  const value: ActivityContextValue = {
    markDone,
    unmarkDone,
    isSolved,
    solvedIds: Array.from(solvedSet),
    activityDays,
    loading,
  };

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivityContext() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivityContext must be used within ActivityProvider');
  return ctx;
}
