import { useParams, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { getTopicById } from '../data';
import { useQuestions } from '../contexts/QuestionsContext';
import { QuestionRow } from '../components/QuestionRow';

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
      <Link to="/" className="text-[var(--accent)] hover:underline">← Dashboard</Link>
      <h1 className="text-2xl font-bold text-[var(--text)] mt-4 mb-6">{topic.name}</h1>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="text-sm text-[var(--text-muted)]">Difficulty:</label>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
      <div className="space-y-3">
        {questions.map((q) => (
          <QuestionRow key={q.id} q={q} />
        ))}
      </div>
    </div>
  );
}
