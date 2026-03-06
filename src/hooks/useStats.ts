import { useMemo } from 'react';
import { useActivityHeatmap } from './useActivity';
import { useActivity } from './useActivity';

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function useStats() {
  const days = useActivityHeatmap();
  const { solvedIds } = useActivity();

  return useMemo(() => {
    const totalSolved = solvedIds.length;
    const activityDates = new Set(Object.keys(days).filter((d) => days[d] > 0));
    if (activityDates.size === 0) {
      return { totalSolved, currentStreak: 0, longestStreak: 0 };
    }
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (activityDates.has(dateStr)) currentStreak++;
      else break;
    }
    const sortedChron = [...activityDates].sort((a, b) => parseDate(a) - parseDate(b));
    let longestStreak = 1;
    let run = 1;
    for (let i = 1; i < sortedChron.length; i++) {
      const prev = parseDate(sortedChron[i - 1]);
      const curr = parseDate(sortedChron[i]);
      const diffDays = (curr - prev) / (24 * 60 * 60 * 1000);
      if (diffDays === 1) run++;
      else run = 1;
      longestStreak = Math.max(longestStreak, run);
    }
    return { totalSolved, currentStreak, longestStreak };
  }, [days, solvedIds.length]);
}
