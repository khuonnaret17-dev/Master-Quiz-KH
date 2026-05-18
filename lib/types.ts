export type UserRole = 'ADMIN' | 'MEMBER';
export type QuizType = 'MULTIPLE_CHOICE' | 'Q_AND_A' | 'VOCABULARY';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Quiz {
  id: string;
  type?: QuizType;
  category: string; // ឧទាហរណ៍៖ សំណួរត្រៀម, ជំនាញឯកទេស, ... (Vignasa)
  question: string;
  options?: {
    [key: string]: string;
  };
  correctAnswer?: string;
  explanation?: string;
  answer?: string; // For Q_AND_A
}

export interface McqItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface QaItem {
  question: string;
  answer: string;
}

export interface QuizCategory {
  category: string;
  items: McqItem[];
  subCategories?: QuizCategory[];
}

export interface ShortAnswerCategory {
  category: string;
  items: QaItem[];
  subCategories?: ShortAnswerCategory[];
}

export interface Ministry {
  id: string;
  name: string;
  khmerName: string;
  description: string;
  details?: string;
  logo: string;
  color: string;
  order?: number;
  quizzes?: Quiz[];
  mcqs?: QuizCategory[];
  shortAnswers?: ShortAnswerCategory[];
  terms?: {
    term: string;
    definition: string;
  }[];
}

export interface Progress {
  [key: string]: {
    completedCount?: number;
    totalCount?: number;
    score: number;
    completedAt?: string;
    ministryId?: string;
    category?: string;
    type?: string;
  };
}
