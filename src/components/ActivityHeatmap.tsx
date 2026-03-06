import { useActivityHeatmap } from '../hooks/useActivity';
import { useMemo } from 'react';

const WEEKS = 53;
const DAYS = 7;

function getHeatLevel(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

export function ActivityHeatmap() {
  const daysData = useActivityHeatmap();

  const cells = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - WEEKS * 7);
    const out: { date: string; count: number; level: number }[] = [];
    for (let i = 0; i < WEEKS * DAYS; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const count = daysData[dateStr] ?? 0;
      out.push({ date: dateStr, count, level: getHeatLevel(count) });
    }
    return out;
  }, [daysData]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-0">
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-3">Last {WEEKS} weeks (Sun–Sat)</p>
        <div className="flex gap-0.5 sm:gap-1 lg:gap-1.5">
          {Array.from({ length: WEEKS }, (_, week) => (
            <div key={week} className="flex flex-col gap-0.5 sm:gap-1 lg:gap-1.5">
              {Array.from({ length: DAYS }, (_, day) => {
                const idx = week * 7 + day;
                const cell = cells[idx];
                if (!cell) return null;
                return (
                  <div
                    key={idx}
                    className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 rounded-sm heat-${cell.level}`}
                    title={`${cell.date}: ${cell.count} solved`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex gap-2 sm:gap-3 items-center mt-3 sm:mt-4 text-xs sm:text-sm text-[var(--text-muted)]">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-sm heat-${level}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
