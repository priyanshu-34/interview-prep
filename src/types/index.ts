export type Difficulty = 'easy' | 'medium' | 'hard' | null;

export interface Track {
  id: string;
  name: string;
  order: number;
}

export interface Topic {
  id: string;
  trackId: string;
  name: string;
  order: number;
}

export interface Question {
  id: string;
  trackId: string;
  title: string;
  topicId: string;
  difficulty: Difficulty;
  gfgLink: string;
  leetcodeLink: string;
  youtubeLink: string;
  order: number;
  /** If false, question is hidden from app (unpublished). Omitted or true = published. */
  public?: boolean;
  /** Optional problem/study description (e.g. for system design). */
  description?: string;
  /** Optional explanation or solution overview (e.g. for system design). */
  explanation?: string;
  /** Optional array of resources (articles, videos, etc.). When set, used instead of gfgLink/leetcodeLink/youtubeLink for display. */
  links?: { label: string; url: string }[];
}

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  questionIds: string[];
  count: number;
}

export interface UserStats {
  totalSolved: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}
