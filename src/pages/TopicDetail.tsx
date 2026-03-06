import { useParams, Link } from 'react-router-dom';
import { getTopicById, getQuestionsByTopic } from '../data';
import { QuestionRow } from '../components/QuestionRow';

export function TopicDetail() {
  const { topicId } = useParams<{ topicId: string }>();
  const topic = topicId ? getTopicById(decodeURIComponent(topicId)) : undefined;
  const questions = topic ? getQuestionsByTopic(topic.id) : [];

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
      <div className="space-y-3">
        {questions.map((q) => (
          <QuestionRow key={q.id} q={q} />
        ))}
      </div>
    </div>
  );
}
