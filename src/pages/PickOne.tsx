import { useState, useMemo } from 'react';
import { useTrack } from '../contexts/TrackContext';
import { useTopics } from '../contexts/TopicsContext';
import { useQuestions } from '../contexts/QuestionsContext';
import { useActivity } from '../hooks/useActivity';
import type { Question } from '../types';
import { LeetCodeIcon, GFGIcon, YouTubeIcon } from '../components/Icons';

export function PickOne() {
  const { trackId } = useTrack();
  const { getTopicsByTrack, getTopicById } = useTopics();
  const { getQuestionsByTrack } = useQuestions();
  const { isSolved } = useActivity();
  const topics = getTopicsByTrack(trackId);
  const allInTrack = useMemo(() => getQuestionsByTrack(trackId), [trackId, getQuestionsByTrack]);

  const [filterTopic, setFilterTopic] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [filterSolved, setFilterSolved] = useState<'all' | 'solved' | 'unsolved'>('unsolved');
  const [picked, setPicked] = useState<Question | null>(null);

  const pool = useMemo(() => {
    let list = allInTrack;
    if (filterTopic) list = list.filter((q) => q.topicId === filterTopic);
    if (filterDifficulty) list = list.filter((q) => (q.difficulty ?? '') === filterDifficulty);
    if (filterSolved === 'solved') list = list.filter((q) => isSolved(q.id));
    if (filterSolved === 'unsolved') list = list.filter((q) => !isSolved(q.id));
    return list;
  }, [allInTrack, filterTopic, filterDifficulty, filterSolved, isSolved]);

  const pickRandom = () => {
    if (pool.length === 0) {
      setPicked(null);
      return;
    }
    const index = Math.floor(Math.random() * pool.length);
    setPicked(pool[index]);
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">Pick one</h1>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Set filters and click &quot;Pick one&quot; to get a random question. Great when you have 15 minutes.
      </p>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
          aria-label="Topic"
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
          aria-label="Difficulty"
        >
          <option value="">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          value={filterSolved}
          onChange={(e) => setFilterSolved(e.target.value as 'all' | 'solved' | 'unsolved')}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
          aria-label="Solved status"
        >
          <option value="all">All</option>
          <option value="solved">Solved only</option>
          <option value="unsolved">Unsolved only</option>
        </select>
        <button
          type="button"
          onClick={pickRandom}
          className="rounded bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Pick one
        </button>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-4">{pool.length} questions in pool</p>
      {picked ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h2 className="font-semibold text-lg text-[var(--text)] mb-2">{picked.title}</h2>
          {getTopicById(picked.topicId) && (
            <p className="text-sm text-[var(--text-muted)] mb-2">{getTopicById(picked.topicId)?.name} · {picked.difficulty ?? '—'}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {picked.leetcodeLink && (
              <a href={picked.leetcodeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-amber-600/20 text-amber-400 px-3 py-2 text-sm hover:bg-amber-600/30">
                <LeetCodeIcon /> LeetCode
              </a>
            )}
            {picked.gfgLink && (
              <a href={picked.gfgLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-green-700/20 text-green-400 px-3 py-2 text-sm hover:bg-green-700/30">
                <GFGIcon /> GFG
              </a>
            )}
            {picked.youtubeLink && (
              <a href={picked.youtubeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-red-600/20 text-red-400 px-3 py-2 text-sm hover:bg-red-600/30">
                <YouTubeIcon /> YouTube
              </a>
            )}
          </div>
        </div>
      ) : pool.length === 0 ? (
        <p className="text-[var(--text-muted)]">No questions match the filters. Try changing them.</p>
      ) : null}
    </div>
  );
}
