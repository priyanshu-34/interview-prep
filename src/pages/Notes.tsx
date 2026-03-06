import { useEffect } from 'react';
import { useTrack } from '../contexts/TrackContext';
import { useNotes } from '../hooks/useNotes';
import { getTopicById } from '../data';
import { useQuestions } from '../contexts/QuestionsContext';
import { QuestionRow } from '../components/QuestionRow';

export function Notes() {
  const { trackId } = useTrack();
  const { getQuestionById } = useQuestions();
  const { notes, loadAllNotes } = useNotes();

  useEffect(() => {
    loadAllNotes();
  }, [loadAllNotes]);

  const questionsWithNotes = Object.keys(notes)
    .map((id) => getQuestionById(id))
    .filter((q): q is NonNullable<typeof q> => q != null && q.trackId === trackId);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">Notes</h1>
      {questionsWithNotes.length === 0 ? (
        <p className="text-[var(--text-muted)]">No notes yet. Add notes from any question row (notes icon).</p>
      ) : (
        <div className="space-y-3">
          {questionsWithNotes.map((q) => {
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
