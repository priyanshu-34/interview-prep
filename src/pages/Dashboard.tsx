import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useTrack } from '../contexts/TrackContext';
import { useTopics } from '../contexts/TopicsContext';
import { useQuestions } from '../contexts/QuestionsContext';
import { useActivity } from '../hooks/useActivity';
import { useStats } from '../hooks/useStats';
import { usePrefs } from '../hooks/usePrefs';
import { todayStr, weekStartStr } from '../lib/date';
import quotesData from '../data/quotes.json';

const quotes = quotesData as { quote: string; author: string }[];

export function Dashboard() {
  const { trackId } = useTrack();
  const { getTopicsByTrack } = useTopics();
  const topics = getTopicsByTrack(trackId);
  const { getQuestionsByTopic } = useQuestions();
  const { isSolved, activityDays } = useActivity();
  const { totalSolved, currentStreak } = useStats();
  const { prefs, updatePrefs } = usePrefs();
  const [dailyGoalInput, setDailyGoalInput] = useState('');
  const totalInTrack = useMemo(() => topics.reduce((acc, t) => acc + getQuestionsByTopic(t.id).length, 0), [topics, getQuestionsByTopic]);
  const dailyQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  const today = todayStr();
  const todayCount = activityDays[today] ?? 0;
  const weekStart = weekStartStr();
  const daysThisWeekWithActivity = useMemo(() => {
    return Object.keys(activityDays).filter((date) => {
      const count = activityDays[date] ?? 0;
      return count > 0 && date >= weekStart && date <= today;
    }).length;
  }, [activityDays, weekStart, today]);
  const dailyGoal = prefs.dailyGoal ?? 0;
  const weeklyGoal = prefs.weeklyGoal ?? 0;

  const saveDailyGoal = () => {
    const n = parseInt(dailyGoalInput, 10);
    if (!Number.isNaN(n) && n >= 0) {
      updatePrefs({ dailyGoal: n });
      setDailyGoalInput('');
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">Dashboard</h1>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4 mb-4 sm:mb-6">
        <p className="text-[var(--text)] font-medium">
          {totalSolved} / {totalInTrack} solved
          {currentStreak > 0 && (
            <span className="text-[var(--success)] ml-2">· {currentStreak} day streak</span>
          )}
        </p>
        {dailyGoal > 0 && (
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Today: {todayCount} / {dailyGoal} questions
            {todayCount >= dailyGoal && <span className="text-[var(--success)] ml-2">Goal met</span>}
          </p>
        )}
        {weeklyGoal > 0 && (
          <p className="text-sm text-[var(--text-muted)] mt-1">
            This week: {daysThisWeekWithActivity} / {weeklyGoal} days with activity
            {daysThisWeekWithActivity >= weeklyGoal && <span className="text-[var(--success)] ml-2">Goal met</span>}
          </p>
        )}
        <p className="text-sm text-[var(--text-muted)] mt-2 italic">&ldquo;{dailyQuote.quote}&rdquo; — {dailyQuote.author}</p>
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] mb-2">Goals (optional)</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-[var(--text)]">
              Daily: <input
                type="number"
                min={0}
                max={50}
                value={dailyGoalInput !== '' ? dailyGoalInput : (dailyGoal ? String(dailyGoal) : '')}
                onChange={(e) => setDailyGoalInput(e.target.value)}
                onBlur={saveDailyGoal}
                onKeyDown={(e) => e.key === 'Enter' && saveDailyGoal()}
                placeholder="0"
                className="w-14 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[var(--text)] text-sm"
              />
              questions
            </label>
            <button type="button" onClick={saveDailyGoal} className="text-sm text-[var(--accent)] hover:underline">Save</button>
            <span className="text-sm text-[var(--text-muted)]">·</span>
            <label className="text-sm text-[var(--text)]">
              Weekly: <input
                type="number"
                min={0}
                max={7}
                value={weeklyGoal}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n) && n >= 0 && n <= 7) updatePrefs({ weeklyGoal: n });
                }}
                className="w-14 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[var(--text)] text-sm"
              />
              days
            </label>
          </div>
        </div>
      </div>
      {dailyGoal > 0 && todayCount === 0 && (
        <div className="rounded-lg border border-amber-600/40 bg-amber-900/20 text-amber-200 px-3 py-2 mb-4 text-sm">
          You haven&apos;t solved any today. Your goal is {dailyGoal} question{dailyGoal === 1 ? '' : 's'}.
        </div>
      )}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => {
          const qs = getQuestionsByTopic(topic.id);
          const solved = qs.filter((q) => isSolved(q.id)).length;
          return (
            <Link
              key={topic.id}
              to={`/topic/${encodeURIComponent(topic.id)}`}
              className="block rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5 hover:border-[var(--accent)]/50 hover:bg-[var(--bg-card)] transition-colors no-underline"
            >
              <h2 className="font-semibold text-lg mb-2 text-[var(--accent)] hover:underline">
                {topic.name}
              </h2>
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
