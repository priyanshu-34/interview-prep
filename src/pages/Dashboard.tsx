import { Link } from 'react-router-dom';
import { useTrack } from '../contexts/TrackContext';
import { getTopicsByTrack, getQuestionsByTopic } from '../data';
import { useActivity } from '../hooks/useActivity';

export function Dashboard() {
  const { trackId } = useTrack();
  const topics = getTopicsByTrack(trackId);
  const { isSolved } = useActivity();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => {
          const qs = getQuestionsByTopic(topic.id);
          const solved = qs.filter((q) => isSolved(q.id)).length;
          return (
            <Link
              key={topic.id}
              to={`/topic/${encodeURIComponent(topic.id)}`}
              className="block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 hover:border-[var(--accent)]/50 transition-colors no-underline text-[var(--text)]"
            >
              <h2 className="font-semibold text-lg mb-2">{topic.name}</h2>
              <p className="text-sm text-[var(--text-muted)]">
                {solved} / {qs.length} solved
              </p>
              <div className="mt-2 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--success)] transition-all"
                  style={{ width: qs.length ? `${(solved / qs.length) * 100}%` : 0 }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
