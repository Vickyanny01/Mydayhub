import {
  Task,
  Routine,
  StudyNote,
  Keepsake,
  DiaryEntry,
  QuickNote,
  ImportantDate,
  AppBackupData,
  MindBoxItem,
} from '../types';
import { getTodayString } from './date';

const STORAGE_KEYS = {
  TASKS: 'myday_tasks_v1',
  ROUTINES: 'myday_routines_v1',
  STUDY_NOTES: 'myday_study_notes_v1',
  KEEPSAKES: 'myday_keepsakes_v1',
  DIARY: 'myday_diary_v1',
  QUICK_NOTES: 'myday_quick_notes_v1',
  IMPORTANT_DATES: 'myday_important_dates_v1',
  PIN_DATA: 'myday_pin_data_v1',
  DIARY_PIN_SEPARATE: 'myday_diary_pin_sep_v1',
  DIARY_PIN_DATA: 'myday_diary_pin_data_v1',
  DARK_MODE: 'myday_theme_v1',
  MIND_BOX: 'myday_mind_box_v1',
  INITIALIZED: 'myday_initialized_v1',
};

export interface PinData {
  hash: string;
  salt: string;
}

// Default initial seed routines
const DEFAULT_ROUTINES: Routine[] = [
  { id: 'r-1', title: 'Morning Stillness & Scripture Reading', time: '06:30', order: 1 },
  { id: 'r-2', title: 'Hydration & Mindful Movement', time: '07:15', order: 2 },
  { id: 'r-3', title: 'Deep Work Session (Prime Focus)', time: '09:00', order: 3 },
  { id: 'r-4', title: 'Midday Walk & Unplugged Reflection', time: '13:00', order: 4 },
  { id: 'r-5', title: 'Evening Daily Review & Diary Entry', time: '21:00', order: 5 },
];

const DEFAULT_KEEPSAKES: Keepsake[] = [
  {
    id: 'k-1',
    type: 'rhema',
    text: 'He leads me beside the still waters. He restores my soul. In quietness and confidence shall be your strength.',
    source: 'Psalm 23:2-3 & Isaiah 30:15',
    date: '2026-10-20',
    tags: ['Peace', 'Strength', 'Anchor'],
  },
  {
    id: 'k-2',
    type: 'conviction',
    text: 'Do not hurry through days meant to be inhabited. Excellence is not frantic haste; it is intentional presence.',
    source: 'Personal Anchor',
    date: '2026-10-22',
    tags: ['Patience', 'Focus'],
  },
  {
    id: 'k-3',
    type: 'inspiration',
    text: 'Simplicity is about subtracting the obvious and adding the meaningful.',
    source: 'John Maeda',
    date: '2026-10-25',
    tags: ['Design', 'Clarity'],
  },
  {
    id: 'k-4',
    type: 'quote',
    text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    source: 'Will Durant',
    date: '2026-10-27',
    tags: ['Routines', 'Habit'],
  },
];

const DEFAULT_STUDY_NOTES: StudyNote[] = [
  {
    id: 'sn-1',
    title: 'The Architecture of Deep Work',
    body: 'Attention is a finite spiritual and cognitive currency. Guard the morning hours before the world places demands on your nervous system. Three uninterrupted hours surpass eight fragmented ones.',
    tags: ['Productivity', 'Mindset', 'Focus'],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'sn-2',
    title: 'Hebrew Word Study: Shalom',
    body: 'Shalom is far richer than absence of conflict. It implies completeness, wholeness, health, safety, and sound order in every relationship and interior thought.',
    tags: ['Theology', 'Language', 'Reflection'],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

const DEFAULT_QUICK_NOTES: QuickNote[] = [
  {
    id: 'qn-1',
    title: 'Guiding Principles for This Season',
    body: '1. Create before consuming.\n2. One primary victory per day.\n3. Keep sacred margins between appointments.\n4. Walk in gratitude daily.',
    isPinned: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    category: 'Life',
  },
  {
    id: 'qn-2',
    title: 'Books to Read Next',
    body: '• The Ruthless Elimination of Hurry\n• Essentialism by Greg McKeown\n• The Practice of the Presence of God',
    isPinned: false,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    category: 'Reading',
  },
];

const DEFAULT_IMPORTANT_DATES: ImportantDate[] = [
  {
    id: 'id-1',
    title: 'Quarterly Solitude & Planning Retreat',
    date: '2026-11-15',
    yearlyRepeat: false,
    category: 'milestone',
  },
  {
    id: 'id-2',
    title: 'Annual Family Thanksgiving Gathering',
    date: '2026-11-26',
    yearlyRepeat: true,
    category: 'anniversary',
  },
];

export function getStoredPinData(): PinData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PIN_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePinData(data: PinData): void {
  localStorage.setItem(STORAGE_KEYS.PIN_DATA, JSON.stringify(data));
}

export function clearPinData(): void {
  localStorage.removeItem(STORAGE_KEYS.PIN_DATA);
}

export function getDiaryPinSeparate(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.DIARY_PIN_SEPARATE) === 'true';
  } catch {
    return false;
  }
}

export function saveDiaryPinSeparate(val: boolean): void {
  localStorage.setItem(STORAGE_KEYS.DIARY_PIN_SEPARATE, String(val));
}

export function getDiaryPinData(): PinData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DIARY_PIN_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDiaryPinData(data: PinData): void {
  localStorage.setItem(STORAGE_KEYS.DIARY_PIN_DATA, JSON.stringify(data));
}

export function clearDiaryPinData(): void {
  localStorage.removeItem(STORAGE_KEYS.DIARY_PIN_DATA);
}

export function getThemePreference(): boolean {
  try {
    // Ignore previously saved theme once to guarantee defaulting to warm Paper light mode
    const hasReset = localStorage.getItem('myday_theme_reset_done_v2');
    if (!hasReset) {
      localStorage.setItem('myday_theme_reset_done_v2', 'true');
      localStorage.setItem(STORAGE_KEYS.DARK_MODE, 'false');
      return false;
    }
    const val = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    return val === 'true';
  } catch {
    return false;
  }
}

export function saveThemePreference(isDark: boolean): void {
  localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDark));
}

export function initializeDataIfEmpty(): void {
  if (typeof window === 'undefined') return;
  const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInit) {
    // Start empty without sample/placeholder data as requested
    if (!localStorage.getItem(STORAGE_KEYS.ROUTINES)) {
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.KEEPSAKES)) {
      localStorage.setItem(STORAGE_KEYS.KEEPSAKES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STUDY_NOTES)) {
      localStorage.setItem(STORAGE_KEYS.STUDY_NOTES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUICK_NOTES)) {
      localStorage.setItem(STORAGE_KEYS.QUICK_NOTES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.IMPORTANT_DATES)) {
      localStorage.setItem(STORAGE_KEYS.IMPORTANT_DATES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DIARY)) {
      localStorage.setItem(STORAGE_KEYS.DIARY, JSON.stringify([]));
    }

    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
}

// Storage helpers with safe parsing

export function getRoutines(): Routine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTINES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRoutines(routines: Routine[]): void {
  localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
}

export function getStudyNotes(): StudyNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDY_NOTES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStudyNotes(notes: StudyNote[]): void {
  localStorage.setItem(STORAGE_KEYS.STUDY_NOTES, JSON.stringify(notes));
}

export function getKeepsakes(): Keepsake[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KEEPSAKES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveKeepsakes(keepsakes: Keepsake[]): void {
  localStorage.setItem(STORAGE_KEYS.KEEPSAKES, JSON.stringify(keepsakes));
}

const DEFAULT_DIARY_ENTRIES: DiaryEntry[] = [
  {
    id: 'diary-seed-nyc',
    date: '2026-11-04',
    title: 'My Travel in NYC',
    body: 'Walking through the avenues between towering skyscrapers with yellow cabs streaming down Manhattan. A profound sense of quiet stillness even amidst the city momentum.',
    mood: 'peaceful',
    emojiSticker: '🕊️',
    themes: ['resilience', 'stillness'],
    photos: [
      'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80',
    ],
    audioMemos: [
      {
        id: 'memo-nyc-1',
        audioUrl: '',
        duration: 84,
        createdAt: '11:42 AM',
        transcription: 'Voice memo: Walking down Manhattan avenue in the crisp autumn air.',
      },
    ],
    updatedAt: '2026-11-04T11:42:00.000Z',
  },
];

export function getDiaryEntries(): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DIARY);
    if (!raw) return DEFAULT_DIARY_ENTRIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DIARY_ENTRIES;
  } catch {
    return DEFAULT_DIARY_ENTRIES;
  }
}

export function saveDiaryEntries(entries: DiaryEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.DIARY, JSON.stringify(entries));
}

export function getQuickNotes(): QuickNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUICK_NOTES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQuickNotes(notes: QuickNote[]): void {
  localStorage.setItem(STORAGE_KEYS.QUICK_NOTES, JSON.stringify(notes));
}

const DEFAULT_PHONE5_TASKS: Task[] = [
  {
    id: 'task-cal-1',
    date: '2026-11-04',
    title: 'Repair Coffee Machine',
    time: '9:00 AM',
    durationMinutes: 30,
    category: 'personal',
    completed: false,
  },
  {
    id: 'task-cal-2',
    date: '2026-11-04',
    title: 'Team Sync Meeting',
    time: '11:00 AM',
    durationMinutes: 45,
    category: 'meeting',
    completed: false,
  },
];

const DEFAULT_PHONE5_DATES: ImportantDate[] = [
  {
    id: 'id-solitude',
    title: 'Quarterly Solitude Retreat',
    date: '2026-11-15',
    yearlyRepeat: false,
    category: 'milestone',
  },
];

export function getTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) return DEFAULT_PHONE5_TASKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PHONE5_TASKS;
  } catch {
    return DEFAULT_PHONE5_TASKS;
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

export function getImportantDates(): ImportantDate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.IMPORTANT_DATES);
    if (!raw) return DEFAULT_PHONE5_DATES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PHONE5_DATES;
  } catch {
    return DEFAULT_PHONE5_DATES;
  }
}

export function saveImportantDates(dates: ImportantDate[]): void {
  localStorage.setItem(STORAGE_KEYS.IMPORTANT_DATES, JSON.stringify(dates));
}

export function getMindBoxItems(): MindBoxItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MIND_BOX);
    if (!raw) {
      return [
        { id: 'mb-1', text: 'Pick up organic roast coffee beans', completed: false, createdAt: new Date().toISOString(), category: 'personal' },
        { id: 'mb-2', text: 'Outline architecture diagram for Q4 vision', completed: false, createdAt: new Date().toISOString(), category: 'deep-work' },
        { id: 'mb-3', text: 'Schedule annual health checkup', completed: false, createdAt: new Date().toISOString(), category: 'health' },
      ];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMindBoxItems(items: MindBoxItem[]): void {
  localStorage.setItem(STORAGE_KEYS.MIND_BOX, JSON.stringify(items));
}

/**
 * Copies all saved routines into the specified date's task list.
 * Prevents duplicating routines that are already added for that date.
 */
export function addRoutinesToDay(targetDate: string, currentTasks: Task[], routines: Routine[]): { updatedTasks: Task[]; addedCount: number } {
  const existingForDate = currentTasks.filter(t => t.date === targetDate);
  const existingRoutineIds = new Set(existingForDate.filter(t => t.routineId).map(t => t.routineId));
  const existingTitles = new Set(existingForDate.map(t => t.title.toLowerCase().trim()));

  const newTasks: Task[] = [];
  let addedCount = 0;

  for (const routine of routines) {
    if (existingRoutineIds.has(routine.id) || existingTitles.has(routine.title.toLowerCase().trim())) {
      continue;
    }
    newTasks.push({
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      date: targetDate,
      title: routine.title,
      time: routine.time,
      completed: false,
      isRoutine: true,
      routineId: routine.id,
    });
    addedCount++;
  }

  const updatedTasks = [...currentTasks, ...newTasks];
  return { updatedTasks, addedCount };
}

/**
 * Exports all user data into a JSON structure
 */
export function createBackup(): AppBackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: getTasks(),
    routines: getRoutines(),
    studyNotes: getStudyNotes(),
    keepsakes: getKeepsakes(),
    diaryEntries: getDiaryEntries(),
    quickNotes: getQuickNotes(),
    importantDates: getImportantDates(),
    mindBoxItems: getMindBoxItems(),
    theme: getThemePreference() ? 'dark' : 'light',
  };
}

/**
 * Restores all user data from a JSON backup
 */
export function restoreBackup(data: Partial<AppBackupData>): boolean {
  try {
    if (Array.isArray(data.tasks)) saveTasks(data.tasks);
    if (Array.isArray(data.routines)) saveRoutines(data.routines);
    if (Array.isArray(data.studyNotes)) saveStudyNotes(data.studyNotes);
    if (Array.isArray(data.keepsakes)) saveKeepsakes(data.keepsakes);
    if (Array.isArray(data.diaryEntries)) saveDiaryEntries(data.diaryEntries);
    if (Array.isArray(data.quickNotes)) saveQuickNotes(data.quickNotes);
    if (Array.isArray(data.importantDates)) saveImportantDates(data.importantDates);
    if (Array.isArray(data.mindBoxItems)) saveMindBoxItems(data.mindBoxItems);
    if (data.theme) saveThemePreference(data.theme === 'dark');
    return true;
  } catch (e) {
    console.error('Failed to restore backup', e);
    return false;
  }
}
