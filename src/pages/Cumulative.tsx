import { useState, useMemo } from 'react';
import { useTrack } from '../contexts/TrackContext';
import { useQuestions } from '../contexts/QuestionsContext';
import { getTopicById } from '../data';
import { useBookmarks } from '../hooks/useBookmarks';
import { useActivity } from '../hooks/useActivity';
import { QuestionRow } from '../components/QuestionRow';

export function Cumulative() {
  const { trackId } = useTrack();
  const { getQuestionsByTrack } = useQuestions();
  const questions = getQuestionsByTrack(trackId);
  const { isBookmarked } = useBookmarks();
  const { isSolved } = useActivity();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState<string>('');
  const [filterSolved, setFilterSolved] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');

  const topicIds = useMemo(() => [...new Set(questions.map((q) => q.topicId))], [questions]);

  const filtered = useMemo(() => {
    let list = questions;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter((q) => q.title.toLowerCase().includes(term));
    }
    if (filterTopic) list = list.filter((q) => q.topicId === filterTopic);
    if (filterSolved === 'solved') list = list.filter((q) => isSolved(q.id));
    if (filterSolved === 'unsolved') list = list.filter((q) => !isSolved(q.id));
    if (filterBookmarked) list = list.filter((q) => isBookmarked(q.id));
    if (filterDifficulty) list = list.filter((q) => (q.difficulty ?? '') === filterDifficulty);
    return list;
  }, [questions, searchTerm, filterTopic, filterSolved, filterBookmarked, filterDifficulty, isSolved, isBookmarked]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text)] mb-6">Cumulative</h1>
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="search"
          placeholder="Search by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text)] placeholder-[var(--text-muted)] min-w-[200px]"
          aria-label="Search questions by title"
        />
        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text)]"
        >
          <option value="">All topics</option>
          {topicIds.map((id) => {
            const t = getTopicById(id);
            return (
              <option key={id} value={id}>{t?.name ?? id}</option>
            );
          })}
        </select>
        <select
          value={filterSolved}
          onChange={(e) => setFilterSolved(e.target.value as 'all' | 'solved' | 'unsolved')}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text)]"
        >
          <option value="all">All</option>
          <option value="solved">Solved</option>
          <option value="unsolved">Unsolved</option>
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text)]"
          aria-label="Filter by difficulty"
        >
          <option value="">All difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <label className="flex items-center gap-2 text-[var(--text)]">
          <input
            type="checkbox"
            checked={filterBookmarked}
            onChange={(e) => setFilterBookmarked(e.target.checked)}
            className="rounded border-[var(--border)]"
          />
          Bookmarked only
        </label>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-4">{filtered.length} questions</p>
      <div className="space-y-3">
        {filtered.map((q) => {
          const topic = getTopicById(q.topicId);
          return (
            <QuestionRow
              key={q.id}
              q={q}
              showTopic
              topicName={topic?.name}
            />
          );
        })}
      </div>
    </div>
  );
}
