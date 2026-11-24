export type QuestionType = 'mcq' | 'short' | 'explanation';

export interface Question {
  id?: string;
  subject: string;
  question: string;
  type: QuestionType;
  options?: string[]; // 4 options for MCQ
  correct?: number;   // 0-3 for MCQ
  answer?: string;    // Explanation or Answer
  isActive?: boolean;
  order?: number;
  createdAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  type: QuestionType;
  isActive: boolean;
  order: number;
  icon?: string;
}

export interface Feedback {
  id?: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
}

export interface LoginRecord {
  id: string;
  username: string;
  passwordUsed: string;
  timestamp: string;
  role: 'user' | 'admin';
}

export interface PresenceRecord {
  id: string;
  username: string;
  role: 'user' | 'admin';
  lastSeen: string;
}

export interface UserSession {
  username: string;
  role: 'user' | 'admin';
  loggedInAt: string;
  isPaid?: boolean;
  permanentAccess?: boolean;
  paidAt?: string;
  transactionRef?: string;
}

export interface PaidUser {
  id: string;
  username: string;
  phoneNumber?: string;
  amount: number;
  currency: string;
  paidAt: string;
  status: 'active' | 'pending' | 'revoked';
  permanentAccess: boolean;
  transactionRef?: string;
  method?: string;
  note?: string;
}

export interface UserAnswerRecord {
  questionIndex: number;
  question: Question;
  selectedOption?: number;
  isCorrect?: boolean;
  userTextAnswer?: string;
}

export type AppThemeId =
  | 'simple_light'
  | 'angkor_paper'
  | 'royal_midnight'
  | 'emerald_forest'
  | 'ocean_sapphire'
  | 'lotus_saffron';

export interface AppThemeConfig {
  id: AppThemeId;
  nameKhmer: string;
  nameEn: string;
  taglineKhmer: string;
  descriptionKhmer: string;
  emoji: string;
  isDark: boolean;
  swatch: {
    bg: string;
    card: string;
    accent: string;
    border: string;
  };
}

export interface BotActionButton {
  label: string;
  type: 'command' | 'url' | 'open_member_login';
  value: string;
}

export interface BotCommandConfig {
  command: string;
  titleKh: string;
  descriptionKh: string;
  title: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  actions: BotActionButton[];
  updatedAt?: string;
}

