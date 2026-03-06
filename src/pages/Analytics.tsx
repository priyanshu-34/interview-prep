import { useMemo } from 'react';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { StatsCards } from '../components/StatsCards';
import { useRecentActivity, useActivity } from '../hooks/useActivity';
import { useTrack } from '../contexts/TrackContext';
import { getTopicsByTrack } from '../data';
import { useQuestions } from '../contexts/QuestionsContext';
import { ExportProgressButton } from '../components/ExportProgressButton';

export function Analytics() {
  const recent = useRecentActivity(14);
  const { trackId } = useTrack();
  const { getQuestionsByTopic } = useQuestions();
  const { solvedIds } = useActivity();
  const topics = getTopicsByTrack(trackId);

  const topicBreakdown = useMemo(() => {
    const solvedSet = new Set(solvedIds);
    return topics.map((topic) => {
      const qs = getQuestionsByTopic(topic.id);
      const solved = qs.filter((q) => solvedSet.has(q.id)).length;
      return { topic, total: qs.length, solved };
    }).filter((row) => row.total > 0).sort((a, b) => b.solved - a.solved);
  }, [topics, solvedIds, getQuestionsByTopic]);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">Analytics</h1>
      <StatsCards />
      <section className="mt-6 sm:mt-8">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-3">Activity heatmap</h2>
        <ActivityHeatmap />
      </section>
      <section className="mt-8 sm:mt-10">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-4">Progress by topic</h2>
        {topicBreakdown.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Mark questions as done to see breakdown.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topicBreakdown.map(({ topic, total, solved }) => {
              const pct = total ? Math.round((solved / total) * 100) : 0;
              return (
                <div
                  key={topic.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-[var(--text)] font-semibold truncate">{topic.name}</span>
                    <span className="text-sm text-[var(--text-muted)] shrink-0">{solved} / {total}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--success)] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">{pct}% complete</p>
                </div>
              );
            })}
          </div>
        )}
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
      <section className="mt-8">
        <ExportProgressButton />
      </section>
    </div>
  );
}
