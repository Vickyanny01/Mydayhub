export type TabType = 'today' | 'library' | 'diary' | 'ai-hub' | 'calendar';

export interface Task {
  id: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  time: string; // 'HH:MM'
  durationMinutes?: number; // Time-block duration
  completed: boolean;
  completedAt?: string;
  notes?: string;
  isRoutine?: boolean;
  routineId?: string;
  category?: 'deep-work' | 'routine' | 'health' | 'meeting' | 'personal' | string;
}

export interface MindBoxItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  category?: string;
}

export interface Routine {
  id: string;
  title: string;
  time: string; // 'HH:MM'
  durationMinutes?: number;
  order: number;
}

export interface StudyNote {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string; // ISO string
  updatedAt: string;
}

export type KeepsakeType = 'conviction' | 'rhema' | 'inspiration' | 'exhortation' | 'quote';

export interface Keepsake {
  id: string;
  type: KeepsakeType;
  text: string;
  source?: string;
  date: string; // 'YYYY-MM-DD'
  tags: string[];
}

export type DiaryMood = 'peaceful' | 'grateful' | 'focused' | 'contemplative' | 'energized' | 'resolute';

export interface AudioMemo {
  id: string;
  audioUrl: string;
  duration: number; // in seconds
  transcription?: string;
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  date: string; // 'YYYY-MM-DD'
  title?: string;
  body: string;
  mood?: DiaryMood;
  emojiSticker?: string; // Floating emoji mood sticker (😊, 🌿, ☕, 🧘, ⚡, 🌙, 🕊️, etc.)
  cursiveQuote?: string; // Handwriting typography for signature or quote
  themes?: string[];
  photos?: string[]; // Masonry photo grid attachments
  audioMemos?: AudioMemo[]; // Playable voice memo cards with visual waveform
  aiSummary?: string;
  updatedAt: string;
}

export interface QuickNote {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  category?: string;
  photos?: string[];
  audioMemos?: AudioMemo[];
  sketches?: string[];
}

export interface ImportantDate {
  id: string;
  title: string;
  date: string; // 'YYYY-MM-DD'
  yearlyRepeat: boolean;
  category?: 'milestone' | 'birthday' | 'anniversary' | 'reminder';
}

export type AIModelType = 'gemini' | 'chatgpt' | 'grok';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: AIModelType;
  timestamp: string;
  chartData?: { label: string; value: number }[];
  insightTitle?: string;
}

export interface AppBackupData {
  version: number;
  exportedAt: string;
  tasks: Task[];
  routines: Routine[];
  studyNotes: StudyNote[];
  keepsakes: Keepsake[];
  diaryEntries: DiaryEntry[];
  quickNotes: QuickNote[];
  importantDates: ImportantDate[];
  mindBoxItems?: MindBoxItem[];
  theme: 'light' | 'dark';
}
