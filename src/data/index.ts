import tracksJson from './tracks.json';
import topicsJson from './topics.json';
import questionsJson from './questions.json';
import type { Track, Topic, Question } from '../types';

export const tracks: Track[] = tracksJson as Track[];
export const topics: Topic[] = topicsJson as Topic[];
export const questions: Question[] = questionsJson as Question[];

export function getTopicsByTrack(trackId: string): Topic[] {
  return topics.filter((t) => t.trackId === trackId).sort((a, b) => a.order - b.order);
}

export function getQuestionsByTrack(trackId: string): Question[] {
  return questions.filter((q) => q.trackId === trackId).sort((a, b) => a.order - b.order);
}

export function getQuestionsByTopic(topicId: string): Question[] {
  return questions.filter((q) => q.topicId === topicId).sort((a, b) => a.order - b.order);
}

export function getTopicById(id: string): Topic | undefined {
  return topics.find((t) => t.id === id);
}

export function getQuestionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}
