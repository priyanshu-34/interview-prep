import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTrack } from '../contexts/TrackContext';
import { getTopicsByTrack, getTopicById } from '../data';
import { useQuestions } from '../contexts/QuestionsContext';
import type { Question } from '../types';
import { LeetCodeIcon, GFGIcon, YouTubeIcon } from '../components/Icons';

const DURATION_OPTIONS = [45, 60];
const COUNT_OPTIONS = [2, 3];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function MockInterview() {
  const { trackId } = useTrack();
  const { getQuestionsByTrack } = useQuestions();
  const topics = getTopicsByTrack(trackId);
  const allInTrack = useMemo(() => getQuestionsByTrack(trackId), [trackId, getQuestionsByTrack]);

  const [topicId, setTopicId] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [count, setCount] = useState(2);
  const [durationMins, setDurationMins] = useState(45);
  const [started, setStarted] = useState(false);
  const [picked, setPicked] = useState<Question[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [ended, setEnded] = useState(false);

  const pool = useMemo(() => {
    let list = allInTrack;
    if (topicId) list = list.filter((q) => q.topicId === topicId);
    if (difficulty !== 'all') list = list.filter((q) => (q.difficulty ?? '') === difficulty);
    return list;
  }, [allInTrack, topicId, difficulty]);

  const start = useCallback(() => {
    if (pool.length < count) return;
    const shuffled = shuffle(pool);
    setPicked(shuffled.slice(0, count));
    setRemainingSeconds(durationMins * 60);
    setStarted(true);
    setEnded(false);
  }, [pool, count, durationMins]);

  useEffect(() => {
    if (!started || ended || remainingSeconds <= 0) return;
    const t = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s <= 1) {
          setEnded(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, ended, remainingSeconds]);

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  if (started && !ended) {
    return (
      <div className="min-h-[60vh] flex flex-col">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-xl font-bold text-[var(--text)]">Mock interview</h1>
          <div className="text-2xl font-mono text-[var(--accent)] tabular-nums">{timeStr}</div>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">Solve without looking at solutions. Open links when done.</p>
        <ol className="list-decimal list-inside space-y-4 flex-1">
          {picked.map((q, i) => (
            <li key={q.id} className="text-[var(--text)] font-medium">
              {q.title}
              {getTopicById(q.topicId) && (
                <span className="text-sm text-[var(--text-muted)] font-normal ml-2">
                  ({getTopicById(q.topicId)?.name} · {q.difficulty ?? '—'})
                </span>
              )}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setEnded(true)}
          className="mt-6 rounded border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-card)]"
        >
          End session
        </button>
      </div>
    );
  }

  if (started && ended) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4">Session over</h1>
        <p className="text-sm text-[var(--text-muted)] mb-4">Review and practice:</p>
        <ul className="space-y-3">
          {picked.map((q) => (
            <li key={q.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <p className="font-medium text-[var(--text)] mb-2">{q.title}</p>
              <div className="flex flex-wrap gap-2">
                {q.leetcodeLink && (
                  <a href={q.leetcodeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-amber-600/20 text-amber-400 px-3 py-2 text-sm hover:bg-amber-600/30">
                    <LeetCodeIcon /> LeetCode
                  </a>
                )}
                {q.gfgLink && (
                  <a href={q.gfgLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-green-700/20 text-green-400 px-3 py-2 text-sm hover:bg-green-700/30">
                    <GFGIcon /> GFG
                  </a>
                )}
                {q.youtubeLink && (
                  <a href={q.youtubeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-red-600/20 text-red-400 px-3 py-2 text-sm hover:bg-red-600/30">
                    <YouTubeIcon /> YouTube
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => { setStarted(false); setPicked([]); }}
          className="mt-6 rounded bg-[var(--accent)] text-white px-4 py-2 text-sm"
        >
          New session
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">Mock interview</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Pick topic and difficulty, then start a timed session. You’ll get N questions to solve without solutions. When time’s up, review with the links.
      </p>
      <div className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">Topic</label>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          >
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          >
            <option value="all">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">Number of questions</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          >
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">Timer (minutes)</label>
          <select
            value={durationMins}
            onChange={(e) => setDurationMins(Number(e.target.value))}
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          >
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <p className="text-sm text-[var(--text-muted)]">{pool.length} questions in pool</p>
        <button
          type="button"
          onClick={start}
          disabled={pool.length < count}
          className="rounded bg-[var(--accent)] text-white px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start session
        </button>
      </div>
    </div>
  );
}
