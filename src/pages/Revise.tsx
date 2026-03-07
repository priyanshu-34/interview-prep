// import { useTrack } from '../contexts/TrackContext';
import { useRevisionQueue } from '../hooks/useRevisionQueue';
import { getTopicById } from '../data';
import { QuestionRow } from '../components/QuestionRow';

export function Revise() {
  // const { trackId } = useTrack();
  const questions = useRevisionQueue();

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">Revise today</h1>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Questions you marked for revision appear first; then oldest solved. Solve a few each day to retain.
      </p>
      {questions.length === 0 ? (
        <p className="text-[var(--text-muted)]">
          No questions due. Mark some as done to see them here, or use “Mark for revision” on any solved question.
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const topic = getTopicById(q.topicId);
            return (
              <QuestionRow key={q.id} q={q} showTopic topicName={topic?.name} />
            );
          })}
        </div>
      )}
    </div>
  );
}
