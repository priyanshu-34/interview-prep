import { useMemo } from 'react';
import { useActivity } from './useActivity';
import { usePrefs } from './usePrefs';
import { useQuestions } from '../contexts/QuestionsContext';
import { useTrack } from '../contexts/TrackContext';
import type { Question } from '../types';

const REVISION_QUEUE_SIZE = 10;

/** Returns questions due for revision: marked-for-revision first, then oldest last-done first. */
export function useRevisionQueue(): Question[] {
  const { trackId } = useTrack();
  const { getQuestionsByTrack } = useQuestions();
  const { solvedIds, lastDoneByQuestion } = useActivity();
  const { prefs } = usePrefs();

  return useMemo(() => {
    const markSet = new Set(prefs.markForRevision);
    const solvedSet = new Set(solvedIds);
    const allInTrack = getQuestionsByTrack(trackId);
    const solvedInTrack = allInTrack.filter((q) => solvedSet.has(q.id));
    const withLastDone = solvedInTrack.map((q) => ({
      q,
      lastDone: lastDoneByQuestion[q.id] ?? '',
      markForRevision: markSet.has(q.id),
    }));
    const sorted = withLastDone.sort((a, b) => {
      if (a.markForRevision && !b.markForRevision) return -1;
      if (!a.markForRevision && b.markForRevision) return 1;
      return a.lastDone.localeCompare(b.lastDone);
    });
    return sorted.slice(0, REVISION_QUEUE_SIZE).map((x) => x.q);
  }, [trackId, getQuestionsByTrack, solvedIds, lastDoneByQuestion, prefs.markForRevision]);
}
