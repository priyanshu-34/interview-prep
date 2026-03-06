import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Question } from '../types';
import questionsJson from '../data/questions.json';

const questionsFallback = questionsJson as Question[];

interface QuestionsContextValue {
  questions: Question[];
  loading: boolean;
  refetch: () => Promise<void>;
  getQuestionsByTrack: (trackId: string) => Question[];
  getQuestionsByTopic: (topicId: string) => Question[];
  getQuestionById: (id: string) => Question | undefined;
}

const QuestionsContext = createContext<QuestionsContextValue | null>(null);

function sortQuestions(qs: Question[]) {
  return [...qs].sort((a, b) => a.order - b.order);
}

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>(questionsFallback);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'questions'));
      if (snap.empty) {
        setQuestions(questionsFallback);
      } else {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id ?? d.id,
            trackId: data.trackId ?? '',
            topicId: data.topicId ?? '',
            title: data.title ?? '',
            difficulty: data.difficulty ?? null,
            gfgLink: data.gfgLink ?? '',
            leetcodeLink: data.leetcodeLink ?? '',
            youtubeLink: data.youtubeLink ?? '',
            order: Number(data.order) ?? 0,
            public: data.public === undefined ? true : data.public === true,
          } as Question;
        });
        setQuestions(list);
      }
    } catch (err) {
      console.error('[Questions] Firestore load failed, using fallback:', err);
      setQuestions(questionsFallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const value = useMemo<QuestionsContextValue>(
    () => ({
      questions,
      loading,
      refetch: fetchQuestions,
      getQuestionsByTrack: (trackId: string) =>
        sortQuestions(questions.filter((q) => q.trackId === trackId && q.public !== false)),
      getQuestionsByTopic: (topicId: string) =>
        sortQuestions(questions.filter((q) => q.topicId === topicId && q.public !== false)),
      getQuestionById: (id: string) => questions.find((q) => q.id === id),
    }),
    [questions, loading, fetchQuestions]
  );

  return (
    <QuestionsContext.Provider value={value}>{children}</QuestionsContext.Provider>
  );
}

export function useQuestions() {
  const ctx = useContext(QuestionsContext);
  if (!ctx) throw new Error('useQuestions must be used within QuestionsProvider');
  return ctx;
}
