import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { StatsCards } from '../components/StatsCards';
import { useRecentActivity } from '../hooks/useActivity';

export function Analytics() {
  const recent = useRecentActivity(14);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Analytics</h1>
      <StatsCards />
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Activity heatmap</h2>
        <ActivityHeatmap />
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="text-[var(--text-muted)]">Mark questions as done to see activity here.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {recent.map(({ date, count }) => (
              <li key={date} className="text-[var(--text)]">
                <span className="text-[var(--text-muted)]">{date}</span>
                <span className="ml-2">{count} solved</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
