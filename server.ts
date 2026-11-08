import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Helper to get GoogleGenAI client with standard AI Studio headers
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Timeout wrapper so AI calls never hang if remote latency spikes
function withTimeout<T>(promise: Promise<T>, ms: number = 9000, errorMsg = 'AI request timed out'): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// 1. AI Daily Recap (Evening Reflection & Insights)
app.post('/api/gemini/daily-recap', async (req, res) => {
  try {
    const { date, tasks = [], diaryEntries = [], routines = [] } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback response when offline or key not provided
      const completed = tasks.filter((t: any) => t.completed).length;
      return res.json({
        summary: `Today on ${date || 'today'}, you recorded ${tasks.length} total tasks with ${completed} completed. Every deliberate effort contributes to steady long-term momentum.`,
        patterns: [
          `Task completion rate: ${tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%`,
          tasks.length ? `Carried intentional focus across ${tasks.length} scheduled blocks.` : 'A quiet, unhurried day with space for reflection.',
        ],
        tomorrowIntention: 'Begin tomorrow by protecting your highest-energy morning block for your most vital task.',
        isFallback: true,
      });
    }

    const prompt = `You are the empathetic, thoughtful AI Copilot of MyDay Hub (a personal minimalist journal and ledger).
Analyze today's date: ${date}
Tasks logged: ${JSON.stringify(tasks, null, 2)}
Diary entries / reflections: ${JSON.stringify(diaryEntries, null, 2)}
Saved daily routines: ${JSON.stringify(routines, null, 2)}

Provide an evening reflection in valid JSON format with these exact fields:
{
  "summary": "2-3 compassionate, editorial sentences capturing the tone and rhythm of the day.",
  "patterns": ["pattern 1 (insight on productivity, habit consistency, or emotional cadence)", "pattern 2 (insight on balance or depth)"],
  "tomorrowIntention": "1 singular, grounding actionable intention for tomorrow morning"
}
Output ONLY raw valid JSON, no markdown formatting, no code fence.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      }),
      8000
    );

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.json({ ...parsed, isFallback: false });
  } catch (error: any) {
    console.error('Error in daily-recap:', error);
    return res.status(200).json({
      summary: 'You moved through the day with purpose. Cherish the progress achieved and rest well tonight.',
      patterns: ['Consistent presence throughout the day.'],
      tomorrowIntention: 'Wake with clarity and start with one foundational routine.',
      isFallback: true,
      error: error.message,
    });
  }
});

// 2. AI Smart Scheduler (Natural Language Parsing into Structured Tasks)
app.post('/api/gemini/smart-scheduler', async (req, res) => {
  try {
    const { prompt: userText, referenceDate = new Date().toISOString().split('T')[0] } = req.body;
    if (!userText || typeof userText !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Simple offline regex fallback
      const timeMatch = userText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
      const time = timeMatch ? timeMatch[0] : '09:00';
      const title = userText.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/, '').replace(/\btoday\b|\btomorrow\b/gi, '').trim() || userText.trim();
      return res.json({
        items: [
          {
            title: title || 'Scheduled Task',
            date: referenceDate,
            time: time,
            durationMinutes: 30,
            notes: 'Created via offline parser',
          },
        ],
        isFallback: true,
      });
    }

    const aiPrompt = `You are an expert natural language scheduling assistant for MyDay Hub.
Reference date is: "${referenceDate}" (YYYY-MM-DD).
Parse the user's freeform text: "${userText}" into an array of scheduled tasks/events.
Resolve relative dates (e.g. "tomorrow", "this Friday", "next Monday", "at 3pm", "from 10am to 11:30am").
If a duration or end time is mentioned (e.g. "for 45 mins", "from 2 to 3:30"), calculate durationMinutes. Default durationMinutes is 30.

Return JSON in this exact shape:
{
  "items": [
    {
      "title": "Clean, concise task title",
      "date": "YYYY-MM-DD",
      "time": "HH:MM (24-hour format e.g. 09:30, 14:00)",
      "durationMinutes": 45,
      "category": "work" | "personal" | "health" | "routine" | "deep-work",
      "notes": "Optional extra detail extracted from prompt"
    }
  ]
}
Output ONLY raw valid JSON, no markdown fences.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: aiPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      }),
      8000
    );

    const text = response.text || '{"items":[]}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.json({ ...parsed, isFallback: false });
  } catch (error: any) {
    console.error('Error in smart-scheduler:', error);
    return res.status(200).json({
      items: [
        {
          title: req.body.prompt || 'New Task',
          date: req.body.referenceDate || new Date().toISOString().split('T')[0],
          time: '10:00',
          durationMinutes: 30,
        },
      ],
      isFallback: true,
      error: error.message,
    });
  }
});

// 3. AI Archive Search ("Ask My Hub" Semantic Search)
app.post('/api/gemini/archive-search', async (req, res) => {
  try {
    const { query, corpus } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        answer: `Offline Search Result: Located keywords for "${query}" across your stored notes and diaries. Connect to the network or check your offline entries list directly.`,
        sources: [],
        isFallback: true,
      });
    }

    const prompt = `You are "Ask My Hub", the personal archive librarian for MyDay Hub.
User Question: "${query}"

Here is the user's complete personal archive data:
Notes: ${JSON.stringify(corpus?.quickNotes || [], null, 1)}
Diary Entries: ${JSON.stringify(corpus?.diaryEntries || [], null, 1)}
Study Notes: ${JSON.stringify(corpus?.studyNotes || [], null, 1)}
Keepsakes (convictions, inspirations): ${JSON.stringify(corpus?.keepsakes || [], null, 1)}

Synthesize a deeply perceptive, helpful response directly answering the user's question by citing their actual thoughts, records, and dates.
Adopt a warm, editorial, Swiss Minimalist tone.

Return JSON in this exact shape:
{
  "answer": "Detailed synthesis addressing the question, connecting past reflections and milestones.",
  "sources": [
    {
      "title": "Title or Date of the item",
      "type": "diary" | "note" | "study" | "keepsake",
      "date": "YYYY-MM-DD or date string",
      "excerpt": "Short relevant quote from the item"
    }
  ]
}
Output ONLY raw valid JSON, no code block delimiters.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      }),
      8000
    );

    const text = response.text || '{"answer":"","sources":[]}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.json({ ...parsed, isFallback: false });
  } catch (error: any) {
    console.error('Error in archive-search:', error);
    const q = (req.body.query || '').toLowerCase();
    const corpus = req.body.corpus || {};
    const sources: any[] = [];
    (corpus.quickNotes || []).forEach((n: any) => {
      if ((n.title && n.title.toLowerCase().includes(q)) || (n.body && n.body.toLowerCase().includes(q))) {
        sources.push({ title: n.title, type: 'note', excerpt: n.body.slice(0, 120) });
      }
    });
    return res.status(200).json({
      answer: sources.length > 0
        ? `In your personal notes, you noted: "${sources[0].excerpt}". This highlights your deliberate design and simplicity principles.`
        : 'Your personal archive reflects deep intentionality across your daily thoughts and principles.',
      sources,
      isFallback: true,
      error: error.message,
    });
  }
});

// 4. AI Adaptive Journal Prompts
app.post('/api/gemini/dynamic-prompts', async (req, res) => {
  try {
    const { recentEntries = [], recentMood } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        prompts: [
          'What gave you an unexpected sense of gratitude or stillness today?',
          'What challenge did you encounter, and how did your perspective shift around it?',
          'If you could give your tomorrow-self one piece of compassionate counsel, what would it be?',
        ],
        detectedSentiment: recentMood || 'contemplative',
        isFallback: true,
      });
    }

    const prompt = `You are a thoughtful journal mentor for MyDay Hub.
Based on the user's recent journal entries and mood:
Recent entries: ${JSON.stringify(recentEntries.slice(-4), null, 2)}
Recent mood: "${recentMood || 'contemplative'}"

Generate 3 bespoke, deeply insightful, open-ended writing prompts tailored to what they seem to be navigating or feeling right now. Avoid generic prompts.

Return JSON:
{
  "detectedSentiment": "1-2 word description of mood / emotional undertone",
  "prompts": [
    "First personalized prompt",
    "Second personalized prompt",
    "Third personalized prompt"
  ]
}
Output ONLY raw valid JSON.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      }),
      8000
    );

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.json({ ...parsed, isFallback: false });
  } catch (error: any) {
    console.error('Error in dynamic-prompts:', error);
    return res.status(200).json({
      prompts: [
        'What moment stood out most vividly today, and why did it linger?',
        'Where in your schedule did you feel most in flow?',
        'What is one unsaid thought you need to release onto paper?',
      ],
      detectedSentiment: 'reflective',
      isFallback: true,
      error: error.message,
    });
  }
});

// 5. AI Audio Memo Transcription
app.post('/api/gemini/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        text: 'Voice memo recorded (Gemini speech transcription active when API key is provided).',
        isFallback: true,
      });
    }

    // Strip data URL prefix if present
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType.split(';')[0],
            data: cleanBase64,
          },
        },
        'Accurately transcribe this spoken audio memo in its original language. Clean up filler words (um, uh) and format into readable sentences with punctuation. Return ONLY the transcription text, no preamble or quotes.',
      ],
    });

    const transcription = response.text?.trim() || '';
    return res.json({ text: transcription, isFallback: false });
  } catch (error: any) {
    console.error('Error in transcribe-audio:', error);
    return res.status(200).json({
      text: 'Voice memo recorded.',
      isFallback: true,
      error: error.message,
    });
  }
});

// 6. AI Thematic Analyzer (Across Library Archives)
app.post('/api/gemini/thematic-analyzer', async (req, res) => {
  try {
    const { routines = [], studyNotes = [], keepsakes = [] } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        overview: 'Your library bridges daily physical routines with enduring convictions and scholarly study notes.',
        themes: [
          { title: 'Habit Architecture', description: `${routines.length} established routines anchor your daily structure.` },
          { title: 'Intellectual Inquiry', description: `${studyNotes.length} study topics explore deep conceptual foundations.` },
          { title: 'Guiding Convictions', description: `${keepsakes.length} personal keepsakes offer perennial inspiration.` },
        ],
        isFallback: true,
      });
    }

    const prompt = `You are the chief curator and philosopher for MyDay Hub's Library Archives.
Routines: ${JSON.stringify(routines, null, 1)}
Study Notes: ${JSON.stringify(studyNotes, null, 1)}
Keepsakes: ${JSON.stringify(keepsakes, null, 1)}

Analyze the overarching motifs, philosophies, and growth themes woven across these three shelves.
Return JSON:
{
  "overview": "A 2-sentence poetic, editorial synthesis of the user's intellectual and daily architecture.",
  "themes": [
    {
      "title": "Theme name",
      "description": "How this theme emerges across their routines, notes, and keepsakes"
    }
  ],
  "curatorNote": "One inspiring observation regarding how their inner convictions reflect in their daily habits."
}
Output ONLY raw valid JSON.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      }),
      8000
    );

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.json({ ...parsed, isFallback: false });
  } catch (error: any) {
    console.error('Error in thematic-analyzer:', error);
    return res.status(200).json({
      overview: 'Your library harmonizes daily deliberate habits with lifelong wisdom.',
      themes: [
        { title: 'Intentional Living', description: 'Aligning time with convictions.' },
      ],
      curatorNote: 'Consistency is the link between your ideas and your everyday reality.',
      isFallback: true,
      error: error.message,
    });
  }
});

// 7. Multi-Model AI Hub Chat (Gemini, ChatGPT persona, Grok persona)
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, model = 'gemini', history = [], corpus } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    const ai = getGeminiClient();

    // Model Persona Descriptions
    const personas: Record<string, string> = {
      gemini: 'You are Gemini 3.8 Flash inside MyDay Hub. You are perceptive, insightful, and calm. You excel at connecting scattered daily tasks, calendar milestones, and private diary entries into holistic patterns of growth.',
      chatgpt: 'You are ChatGPT (GPT-4o) persona inside MyDay Hub. You are structured, empathetic, and pragmatic. You give crystal-clear advice, organize tasks logically, and motivate with warmth.',
      grok: 'You are Grok 3 persona inside MyDay Hub. You are witty, direct, philosophical, and truth-seeking. You cut through rationalizations with humor and sharp candor.',
    };

    const selectedPersona = personas[model] || personas.gemini;

    if (!ai) {
      // Offline fallback response with mock visual insight chart
      const lower = message.toLowerCase();
      const wantsChart = lower.includes('trend') || lower.includes('chart') || lower.includes('pattern') || lower.includes('mood') || lower.includes('focus') || lower.includes('insight');

      return res.json({
        reply: `[${model.toUpperCase()} Mode] I'm reflecting on your entries offline. You're building steady consistency across your tasks and reflections. Keep focusing on what energizes you.`,
        chartData: wantsChart
          ? [
              { label: 'Mon', value: 65 },
              { label: 'Tue', value: 80 },
              { label: 'Wed', value: 72 },
              { label: 'Thu', value: 88 },
              { label: 'Fri', value: 82 },
              { label: 'Sat', value: 90 },
              { label: 'Sun', value: 85 },
            ]
          : undefined,
        insightTitle: wantsChart ? 'Weekly Focus & Clarity Index' : undefined,
        model,
        isFallback: true,
      });
    }

    const prompt = `${selectedPersona}
User message: "${message}"
Recent chat context: ${JSON.stringify(history.slice(-4))}
User's Hub Data:
Tasks logged: ${JSON.stringify((corpus?.tasks || []).slice(0, 10))}
Recent Diary: ${JSON.stringify((corpus?.diaryEntries || []).slice(0, 5))}
Recent Notes: ${JSON.stringify((corpus?.notes || []).slice(0, 5))}

Answer the user directly with genuine intelligence.
If the user asks for insights, trends, mood, focus, or habit patterns, include a visual chart data array in "chartData" (5-7 data points with "label" and "value" from 0 to 100) and an "insightTitle".

Return JSON:
{
  "reply": "Your markdown-formatted response string",
  "chartData": [{"label": "Day/Metric", "value": 75}],
  "insightTitle": "Optional title for chart or null"
}
Output ONLY raw valid JSON.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      }),
      9000
    );

    const text = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return res.json({
      reply: parsed.reply || 'Reflecting on your journal entries and schedule.',
      chartData: parsed.chartData && parsed.chartData.length > 0 ? parsed.chartData : undefined,
      insightTitle: parsed.insightTitle || undefined,
      model,
      isFallback: false,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    return res.status(200).json({
      reply: 'I analyzed your recent journal cadence. You have sustained mindful focus across this week.',
      chartData: [
        { label: 'Mon', value: 65 },
        { label: 'Tue', value: 78 },
        { label: 'Wed', value: 84 },
        { label: 'Thu', value: 92 },
        { label: 'Fri', value: 80 },
      ],
      insightTitle: 'Mindful Focus Trend',
      model: req.body.model || 'gemini',
      isFallback: true,
      error: error.message,
    });
  }
});

// Vite middleware in development or serve static in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false, // Fix: Disable HMR WebSocket in cloud preview
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MyDay Hub server running at http://0.0.0.0:${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer();
