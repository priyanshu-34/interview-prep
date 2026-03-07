import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTrack } from '../contexts/TrackContext';
import { useQuestions } from '../contexts/QuestionsContext';
import { getTopicById } from '../data';
import { useBookmarks } from '../hooks/useBookmarks';
import { useActivity } from '../hooks/useActivity';
import { QuestionRow } from '../components/QuestionRow';
import { QuestionTableRow } from '../components/QuestionTableRow';

const CUMULATIVE_TABLE_COLS = 5;

export function Cumulative() {
  const [searchParams] = useSearchParams();
  const topicFromUrl = searchParams.get('topic') ?? '';
  const { trackId } = useTrack();
  const { getQuestionsByTrack } = useQuestions();
  const questions = getQuestionsByTrack(trackId);
  const { isBookmarked } = useBookmarks();
  const { isSolved } = useActivity();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState<string>(topicFromUrl);
  const [filterSolved, setFilterSolved] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');

  useEffect(() => {
    if (topicFromUrl && filterTopic !== topicFromUrl) setFilterTopic(topicFromUrl);
  }, [topicFromUrl]);

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
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">Cumulative</h1>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <input
          type="search"
          placeholder="Search by title"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-48 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:py-1.5 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0"
          aria-label="Search questions by title"
        />
        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:py-1.5 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0"
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
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:py-1.5 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0"
        >
          <option value="all">All</option>
          <option value="solved">Solved</option>
          <option value="unsolved">Unsolved</option>
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 sm:py-1.5 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0"
          aria-label="Filter by difficulty"
        >
          <option value="">All difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--text)] min-h-[44px] sm:min-h-0 cursor-pointer">
          <input
            type="checkbox"
            checked={filterBookmarked}
            onChange={(e) => setFilterBookmarked(e.target.checked)}
            className="rounded border-[var(--border)] w-4 h-4"
          />
          <span>Bookmarked only</span>
        </label>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-4">{filtered.length} questions</p>
      {/* Mobile: card list with line 1 = title, line 2 = links + options */}
      <div className="md:hidden space-y-3">
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
      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0 rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
              <th className="text-left p-3 text-[var(--text-muted)]">Title</th>
              <th className="text-left p-3 text-[var(--text-muted)]">Topic</th>
              <th className="text-left p-3 text-[var(--text-muted)]">Difficulty</th>
              <th className="text-left p-3 text-[var(--text-muted)]">Links</th>
              <th className="p-3 text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => {
              const topic = getTopicById(q.topicId);
              return (
                <QuestionTableRow
                  key={q.id}
                  q={q}
                  showTopic
                  topicName={topic?.name}
                  colSpan={CUMULATIVE_TABLE_COLS}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
