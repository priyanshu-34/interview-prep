import { useMemo } from 'react';
import { useActivityContext } from '../contexts/ActivityContext';

/** Use shared activity state (mark done, solved list). Must be inside ActivityProvider. */
export function useActivity() {
  return useActivityContext();
}

/** Uses activity data from context — no extra Firestore reads. */
export function useActivityHeatmap() {
  const { activityDays } = useActivityContext();
  return activityDays;
}

/** Uses activity data from context — no extra Firestore reads. */
export function useRecentActivity(limitCount: number = 30) {
  const { activityDays } = useActivityContext();
  return useMemo(() => {
    const list = Object.entries(activityDays)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limitCount);
    return list;
  }, [activityDays, limitCount]);
}
