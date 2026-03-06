import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useTrack } from '../contexts/TrackContext';
import { getTopicsByTrack } from '../data';
import { useQuestions } from '../contexts/QuestionsContext';
import { useActivity } from '../hooks/useActivity';
import { useStats } from '../hooks/useStats';
import quotesData from '../data/quotes.json';

const quotes = quotesData as { quote: string; author: string }[];

export function Dashboard() {
  const { trackId } = useTrack();
  const topics = getTopicsByTrack(trackId);
  const { getQuestionsByTopic } = useQuestions();
  const { isSolved } = useActivity();
  const { totalSolved, currentStreak } = useStats();
  const totalInTrack = useMemo(() => topics.reduce((acc, t) => acc + getQuestionsByTopic(t.id).length, 0), [topics, getQuestionsByTopic]);
  const dailyQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Dashboard</h1>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 mb-6">
        <p className="text-[var(--text)] font-medium">
          {totalSolved} / {totalInTrack} solved
          {currentStreak > 0 && (
            <span className="text-[var(--success)] ml-2">· {currentStreak} day streak</span>
          )}
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-2 italic">&ldquo;{dailyQuote.quote}&rdquo; — {dailyQuote.author}</p>
      </div>
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
