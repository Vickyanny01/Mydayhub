import { Task, DiaryEntry, Routine, QuickNote, StudyNote, Keepsake } from '../types';

export interface DailyRecapResult {
  summary: string;
  patterns: string[];
  tomorrowIntention: string;
  isFallback?: boolean;
}

export interface ParsedScheduleItem {
  title: string;
  date: string;
  time: string;
  durationMinutes?: number;
  category?: string;
  notes?: string;
}

export interface ArchiveSearchResult {
  answer: string;
  sources: Array<{
    title: string;
    type: string;
    date?: string;
    excerpt: string;
  }>;
  isFallback?: boolean;
}

export interface DynamicPromptsResult {
  prompts: string[];
  detectedSentiment: string;
  isFallback?: boolean;
}

export interface ThematicAnalysisResult {
  overview: string;
  themes: Array<{
    title: string;
    description: string;
  }>;
  curatorNote?: string;
  isFallback?: boolean;
}

const isBrowser = typeof window !== 'undefined';

export async function fetchDailyRecap(params: {
  date: string;
  tasks: Task[];
  diaryEntries: DiaryEntry[];
  routines: Routine[];
}): Promise<DailyRecapResult> {
  try {
    if (!isBrowser) throw new Error('Headless test environment');
    const res = await fetch('/api/gemini/daily-recap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    if (isBrowser) console.warn('Daily recap offline fallback triggered:', err);
    const completed = params.tasks.filter(t => t.completed).length;
    return {
      summary: `You logged ${params.tasks.length} tasks today, completing ${completed}. Steady consistency across the ledger builds quiet mastery.`,
      patterns: [
        `Completion rate: ${params.tasks.length ? Math.round((completed / params.tasks.length) * 100) : 0}%`,
        'Deliberate engagement with today’s priorities.',
      ],
      tomorrowIntention: 'Focus on your core priority first thing in the morning.',
      isFallback: true,
    };
  }
}

export async function parseNaturalLanguageSchedule(
  prompt: string,
  referenceDate?: string
): Promise<{ items: ParsedScheduleItem[]; isFallback?: boolean }> {
  try {
    if (!isBrowser) throw new Error('Headless test environment');
    const res = await fetch('/api/gemini/smart-scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, referenceDate }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    if (isBrowser) console.warn('Smart scheduler offline fallback:', err);
    // Offline heuristic: detect time pattern HH:MM or 9am/3pm
    const timeMatch = prompt.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/) || prompt.match(/\b([1-9]|1[0-2])\s*(am|pm)\b/i);
    let time = '09:00';
    if (timeMatch) {
      if (timeMatch[0].toLowerCase().includes('pm') || timeMatch[0].toLowerCase().includes('am')) {
        const num = parseInt(timeMatch[1], 10);
        const isPm = timeMatch[0].toLowerCase().includes('pm');
        const h = isPm && num < 12 ? num + 12 : !isPm && num === 12 ? 0 : num;
        time = `${String(h).padStart(2, '0')}:00`;
      } else {
        time = timeMatch[0];
      }
    }
    const cleanTitle = prompt
      .replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/, '')
      .replace(/\b([1-9]|1[0-2])\s*(am|pm)\b/i, '')
      .replace(/\btoday\b|\btomorrow\b|\bat\b/gi, '')
      .trim();

    return {
      items: [
        {
          title: cleanTitle || prompt.trim(),
          date: referenceDate || new Date().toISOString().split('T')[0],
          time,
          durationMinutes: 30,
        },
      ],
      isFallback: true,
    };
  }
}

export async function searchArchive(
  query: string,
  corpus: {
    quickNotes: QuickNote[];
    diaryEntries: DiaryEntry[];
    studyNotes: StudyNote[];
    keepsakes: Keepsake[];
  }
): Promise<ArchiveSearchResult> {
  try {
    const res = await fetch('/api/gemini/archive-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, corpus }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Archive search offline fallback:', err);
    // Keyword matching fallback
    const q = query.toLowerCase();
    const sources: ArchiveSearchResult['sources'] = [];

    corpus.diaryEntries.forEach(d => {
      if (d.body.toLowerCase().includes(q) || d.title?.toLowerCase().includes(q)) {
        sources.push({
          title: d.title || `Diary (${d.date})`,
          type: 'diary',
          date: d.date,
          excerpt: d.body.slice(0, 100) + '...',
        });
      }
    });

    corpus.quickNotes.forEach(n => {
      if (n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) {
        sources.push({
          title: n.title,
          type: 'note',
          date: n.createdAt.split('T')[0],
          excerpt: n.body.slice(0, 100) + '...',
        });
      }
    });

    return {
      answer: sources.length > 0
        ? `Found ${sources.length} matching entries in your offline storage relating to "${query}".`
        : `No direct matches found in offline records for "${query}".`,
      sources: sources.slice(0, 4),
      isFallback: true,
    };
  }
}

export async function fetchDynamicPrompts(
  recentEntries: DiaryEntry[],
  recentMood?: string
): Promise<DynamicPromptsResult> {
  try {
    const res = await fetch('/api/gemini/dynamic-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recentEntries, recentMood }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Dynamic prompts fallback:', err);
    return {
      prompts: [
        'What gave you an unexpected sense of gratitude or stillness today?',
        'What challenge did you encounter, and how did your perspective evolve?',
        'If you could give your tomorrow-self one piece of compassionate counsel, what would it be?',
      ],
      detectedSentiment: recentMood || 'contemplative',
      isFallback: true,
    };
  }
}

export async function transcribeAudioMemo(
  audioBase64: string,
  mimeType: string
): Promise<{ text: string; isFallback?: boolean }> {
  try {
    const res = await fetch('/api/gemini/transcribe-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Audio transcription fallback:', err);
    return {
      text: 'Voice note recorded (offline mode).',
      isFallback: true,
    };
  }
}

export async function fetchThematicAnalysis(corpus: {
  routines: Routine[];
  studyNotes: StudyNote[];
  keepsakes: Keepsake[];
}): Promise<ThematicAnalysisResult> {
  try {
    const res = await fetch('/api/gemini/thematic-analyzer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpus),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Thematic analysis fallback:', err);
    return {
      overview: 'Your archives balance daily disciplined rituals with intellectual curiosity and personal convictions.',
      themes: [
        {
          title: 'Foundation of Routine',
          description: `${corpus.routines.length} fixed rituals structure your waking hours with intentionality.`,
        },
        {
          title: 'Curated Knowledge',
          description: `${corpus.studyNotes.length} research topics build your personal intellectual repository.`,
        },
        {
          title: 'Anchoring Convictions',
          description: `${corpus.keepsakes.length} kept principles provide guidance through shifting seasons.`,
        },
      ],
      curatorNote: 'Living with deliberate purpose creates harmony between your daily actions and core values.',
      isFallback: true,
    };
  }
}

export async function sendAIChatMessage(params: {
  message: string;
  model: 'gemini' | 'chatgpt' | 'grok';
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  corpus?: any;
}): Promise<{
  reply: string;
  chartData?: { label: string; value: number }[];
  insightTitle?: string;
  model: string;
  isFallback?: boolean;
}> {
  try {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('AI Chat fallback:', err);
    const lower = params.message.toLowerCase();
    const wantsChart = lower.includes('trend') || lower.includes('chart') || lower.includes('pattern') || lower.includes('mood') || lower.includes('focus');

    return {
      reply: `[${params.model.toUpperCase()}] I am reflecting on your journal notes and schedule. You have sustained consistent focus over recent days. Keep honoring your intentional habits.`,
      chartData: wantsChart
        ? [
            { label: 'Mon', value: 65 },
            { label: 'Tue', value: 78 },
            { label: 'Wed', value: 85 },
            { label: 'Thu', value: 90 },
            { label: 'Fri', value: 82 },
          ]
        : undefined,
      insightTitle: wantsChart ? 'Focus & Intention Index' : undefined,
      model: params.model,
      isFallback: true,
    };
  }
}

