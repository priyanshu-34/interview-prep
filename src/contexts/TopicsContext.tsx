import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getTopicsByTrack as getStaticTopicsByTrack, getTopicById as getStaticTopicById } from '../data';
import type { Topic } from '../types';

const CUSTOM_TOPICS_REF = 'customTopics';

function slug(str: string): string {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
}

interface TopicsContextValue {
  customTopics: Topic[];
  getTopicById: (id: string) => Topic | undefined;
  getTopicsByTrack: (trackId: string) => Topic[];
  addCustomTopic: (topic: Omit<Topic, 'id'>) => Promise<void>;
  isLoading: boolean;
}

const TopicsContext = createContext<TopicsContextValue | null>(null);

export function TopicsProvider({ children }: { children: React.ReactNode }) {
  const [customTopics, setCustomTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', CUSTOM_TOPICS_REF));
        if (snap.exists() && snap.data()?.topics) {
          const list = snap.data().topics as Topic[];
          setCustomTopics(Array.isArray(list) ? list : []);
        }
      } catch {
        setCustomTopics([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const getTopicById = useCallback(
    (id: string): Topic | undefined => {
      return getStaticTopicById(id) ?? customTopics.find((t) => t.id === id);
    },
    [customTopics]
  );

  const getTopicsByTrack = useCallback(
    (trackId: string): Topic[] => {
      const staticList = getStaticTopicsByTrack(trackId);
      const customList = customTopics.filter((t) => t.trackId === trackId);
      return [...staticList, ...customList].sort((a, b) => a.order - b.order);
    },
    [customTopics]
  );

  const addCustomTopic = useCallback(async (topic: Omit<Topic, 'id'>) => {
    const id = `custom_${Date.now()}_${slug(topic.name)}`;
    const newTopic: Topic = { ...topic, id };
    const updated = [...customTopics, newTopic];
    await setDoc(doc(db, 'config', CUSTOM_TOPICS_REF), { topics: updated });
    setCustomTopics(updated);
  }, [customTopics]);

  const value = useMemo(
    () => ({
      customTopics,
      getTopicById,
      getTopicsByTrack,
      addCustomTopic,
      isLoading,
    }),
    [customTopics, getTopicById, getTopicsByTrack, addCustomTopic, isLoading]
  );

  return <TopicsContext.Provider value={value}>{children}</TopicsContext.Provider>;
}

export function useTopics(): TopicsContextValue {
  const ctx = useContext(TopicsContext);
  if (!ctx) {
    return {
      customTopics: [],
      getTopicById: getStaticTopicById,
      getTopicsByTrack: getStaticTopicsByTrack,
      addCustomTopic: async () => {},
      isLoading: false,
    };
  }
  return ctx;
}
