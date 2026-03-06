import { useParams, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { getTopicById } from '../data';
import { useQuestions } from '../contexts/QuestionsContext';
import { QuestionRow } from '../components/QuestionRow';
import { QuestionTableRow } from '../components/QuestionTableRow';

const TOPIC_TABLE_COLS = 4; // Title, Difficulty, Links, Actions (no Topic column)

export function TopicDetail() {
  const { topicId } = useParams<{ topicId: string }>();
  const { getQuestionsByTopic } = useQuestions();
  const topic = topicId ? getTopicById(decodeURIComponent(topicId)) : undefined;
  const allQuestions = topic ? getQuestionsByTopic(topic.id) : [];
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');

  const questions = useMemo(() => {
    if (!filterDifficulty) return allQuestions;
    return allQuestions.filter((q) => (q.difficulty ?? '') === filterDifficulty);
  }, [allQuestions, filterDifficulty]);

  if (!topic) {
    return (
      <div>
        <Link to="/" className="text-[var(--accent)] hover:underline">← Dashboard</Link>
        <p className="mt-4 text-[var(--text-muted)]">Topic not found.</p>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="text-[var(--accent)] hover:underline text-sm sm:text-base">← Dashboard</Link>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mt-4 mb-4 sm:mb-6">{topic.name}</h1>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
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
        <span className="text-sm text-[var(--text-muted)]">
          {questions.length} of {allQuestions.length} questions
        </span>
      </div>
      {/* Mobile: card list with line 1 = title, line 2 = links + options */}
      <div className="md:hidden space-y-3">
        {questions.map((q) => (
          <QuestionRow key={q.id} q={q} />
        ))}
      </div>
      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0 rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
              <th className="text-left p-3 text-[var(--text-muted)]">Title</th>
              <th className="text-left p-3 text-[var(--text-muted)]">Difficulty</th>
              <th className="text-left p-3 text-[var(--text-muted)]">Links</th>
              <th className="p-3 text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <QuestionTableRow
                key={q.id}
                q={q}
                colSpan={TOPIC_TABLE_COLS}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
