import { useMemo } from 'react';
import { useTrack } from '../contexts/TrackContext';
import { getTopicsByTrack } from '../data';
import { useQuestions } from '../contexts/QuestionsContext';
import { useActivity } from '../hooks/useActivity';

/**
 * Readiness score: average topic completion (0–100).
 * Each topic contributes its % complete; score = average across topics.
 * Helps answer "Am I ready?" by balancing coverage across topics.
 */
export function useReadinessScore(): number {
  const { trackId } = useTrack();
  const topics = getTopicsByTrack(trackId);
  const { getQuestionsByTopic } = useQuestions();
  const { solvedIds } = useActivity();

  return useMemo(() => {
    const solvedSet = new Set(solvedIds);
    if (topics.length === 0) return 0;
    let sum = 0;
    for (const topic of topics) {
      const qs = getQuestionsByTopic(topic.id);
      if (qs.length === 0) continue;
      const solved = qs.filter((q) => solvedSet.has(q.id)).length;
      sum += (solved / qs.length) * 100;
    }
    const topicsWithQuestions = topics.filter((t) => getQuestionsByTopic(t.id).length > 0).length;
    if (topicsWithQuestions === 0) return 0;
    return Math.round(sum / topicsWithQuestions);
  }, [topics, solvedIds, getQuestionsByTopic]);
}
