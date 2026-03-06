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
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Analytics</h1>
      <StatsCards />
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Progress by topic</h2>
        {topicBreakdown.length === 0 ? (
          <p className="text-[var(--text-muted)]">Mark questions as done to see breakdown.</p>
        ) : (
          <ul className="space-y-2">
            {topicBreakdown.map(({ topic, total, solved }) => (
              <li key={topic.id} className="flex items-center gap-3 text-sm">
                <span className="text-[var(--text)] font-medium min-w-[140px]">{topic.name}</span>
                <span className="text-[var(--text-muted)]">{solved} / {total}</span>
                <div className="flex-1 max-w-[200px] h-2 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--success)]"
                    style={{ width: total ? `${(solved / total) * 100}%` : 0 }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
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
      <section className="mt-8">
        <ExportProgressButton />
      </section>
    </div>
  );
}
