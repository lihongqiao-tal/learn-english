
export enum Proficiency {
  BEGINNER = '生疏',
  INTERMEDIATE = '掌握',
  ADVANCED = '精通'
}

export interface Chunk {
  id: string;
  original: string; // The chunk itself (e.g., "get the hang of")
  translation: string; // Chinese meaning
  exampleEn: string;
  exampleZh: string;
  category?: string;
  proficiency: Proficiency;
  lastReviewed?: number;
}

export interface SpeakingSession {
  id: string;
  topic: string;
  question: string;
  userTranscription: string;
  optimizedVersion: string;
  feedback: string;
  extractedChunks: Chunk[];
  timestamp: number;
}

export interface TopicSuggestion {
  title: string;
  questions: string[];
}
