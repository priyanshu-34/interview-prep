import { useTrack } from '../contexts/TrackContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useTopics } from '../contexts/TopicsContext';
import { useQuestions } from '../contexts/QuestionsContext';
import { QuestionRow } from '../components/QuestionRow';

export function Bookmarks() {
  const { trackId } = useTrack();
  const { getTopicById } = useTopics();
  const { getQuestionById } = useQuestions();
  const { bookmarkIds } = useBookmarks();
  const questions = bookmarkIds
    .map((id) => getQuestionById(id))
    .filter((q): q is NonNullable<typeof q> => q != null && q.trackId === trackId);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">Bookmarks</h1>
      {questions.length === 0 ? (
        <p className="text-[var(--text-muted)]">No bookmarked questions. Bookmark from Dashboard or Cumulative.</p>
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
