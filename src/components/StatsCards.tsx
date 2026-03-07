import { useStats } from '../hooks/useStats';
import { useReadinessScore } from '../hooks/useReadinessScore';
import { useTrack } from '../contexts/TrackContext';
import { useQuestions } from '../contexts/QuestionsContext';

export function StatsCards() {
  const { totalSolved, currentStreak, longestStreak } = useStats();
  const readinessScore = useReadinessScore();
  const { trackId } = useTrack();
  const { getQuestionsByTrack } = useQuestions();
  const totalInTrack = getQuestionsByTrack(trackId).length;
  const pct = totalInTrack > 0 ? Math.round((totalSolved / totalInTrack) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-[var(--accent)]">{readinessScore}%</div>
        <div className="text-xs sm:text-sm text-[var(--text-muted)]">Readiness</div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">Avg topic coverage</div>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-[var(--text)]">{totalSolved}</div>
        <div className="text-xs sm:text-sm text-[var(--text-muted)]">Solved</div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">
          {totalSolved} / {totalInTrack} ({pct}%)
        </div>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-[var(--success)]">{currentStreak}</div>
        <div className="text-xs sm:text-sm text-[var(--text-muted)]">Current streak (days)</div>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-[var(--accent)]">{longestStreak}</div>
        <div className="text-xs sm:text-sm text-[var(--text-muted)]">Longest streak</div>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-[var(--text)]">{totalInTrack}</div>
        <div className="text-xs sm:text-sm text-[var(--text-muted)]">Total in track</div>
      </div>
    </div>
  );
}
