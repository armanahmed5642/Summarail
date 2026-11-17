export type SummaryLength = 'short' | 'medium' | 'detailed';
export type SummaryStyle = 'paragraph' | 'bullet_points' | 'executive' | 'simple' | 'academic';
export type SummaryType = 'text' | 'pdf' | 'article' | 'notes' | 'image';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  default_summary_length: SummaryLength;
  default_summary_style: SummaryStyle;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  profile_image?: string;
  preferences: UserPreferences;
}

export interface Summary {
  _id: string;
  user_id: string;
  title: string;
  original_text: string;
  summary: string;
  summary_type: SummaryType;
  summary_length: SummaryLength;
  summary_style: string;
  key_points: string[];
  keywords: string[];
  original_word_count: number;
  summary_word_count: number;
  compression_ratio: number;
  source_url?: string;
  filename?: string;
  page_count?: number;
  created_at: string;
}

export interface DocumentRecord {
  _id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  page_count?: number;
  processing_status: 'completed' | 'processing' | 'failed';
  summary_id?: string;
  created_at: string;
}

export interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  mastered?: boolean;
}

export interface FlashcardDeck {
  _id: string;
  user_id: string;
  title: string;
  source_title?: string;
  cards: FlashcardItem[];
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizResult {
  score: number;
  total: number;
  completedAt: string;
  userAnswers?: Record<string, number>;
}

export interface QuizRecord {
  _id: string;
  user_id: string;
  title: string;
  source_title?: string;
  questions: QuizQuestion[];
  results?: QuizResult[];
  created_at: string;
}

export interface DashboardStats {
  totalSummaries: number;
  documentsProcessed: number;
  flashcardsCreated: number;
  quizzesCompleted: number;
  totalWordsSummarized: number;
  hoursSaved: number;
}
