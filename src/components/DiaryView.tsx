import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialIcon } from './MaterialIcon';
import { DiaryEntry, DiaryMood, AudioMemo } from '../types';
import {
  formatStampedDate,
  parseDateString,
  formatDateToString,
  getTodayString,
} from '../utils/date';
import {
  getDiaryPinSeparate,
  getDiaryPinData,
  saveDiaryPinData,
  PinData,
} from '../utils/storage';
import { verifyPin, hashPin } from '../utils/crypto';
import { fetchDynamicPrompts } from '../utils/ai';

interface DiaryViewProps {
  entries: DiaryEntry[];
  onUpdateEntries: (entries: DiaryEntry[]) => void;
  appPinData: PinData | null;
}

const EMOJI_STICKERS = ['😊', '🌿', '☕', '🧘', '⚡', '🌙', '🕊️', '✨', '🌻', '🏔️'];

const MOODS: { id: DiaryMood; label: string; icon: string }[] = [
  { id: 'peaceful', label: 'Peaceful', icon: '🕊️' },
  { id: 'grateful', label: 'Grateful', icon: '🌿' },
  { id: 'focused', label: 'Focused', icon: '⚡' },
  { id: 'contemplative', label: 'Contemplative', icon: '🌙' },
  { id: 'energized', label: 'Energized', icon: '☀️' },
  { id: 'resolute', label: 'Resolute', icon: '🏔️' },
];

const DEFAULT_PROMPTS = [
  'What moment brought an unexpected feeling of stillness or gratitude today?',
  'Where did you notice subtle personal growth or resilience recently?',
  'What small observation would you grieve forgetting from today?',
  'What intention do you carry into the quiet of this evening?',
];

export const DiaryView: React.FC<DiaryViewProps> = ({
  entries,
  onUpdateEntries,
  appPinData,
}) => {
  const todayStr = getTodayString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Lock state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [showPinPad, setShowPinPad] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

  // View mode - default to timeline matching Phone 4
  const [viewMode, setViewMode] = useState<'editor' | 'timeline'>('timeline');

  // Entry content state
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [mood, setMood] = useState<DiaryMood | undefined>(undefined);
  const [emojiSticker, setEmojiSticker] = useState<string>('🕊️');
  const [cursiveQuote, setCursiveQuote] = useState<string>('');
  const [themes, setThemes] = useState<string[]>([]);
  const [newThemeInput, setNewThemeInput] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [audioMemos, setAudioMemos] = useState<AudioMemo[]>([]);

  // Audio Playback state
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic prompts state
  const [activePrompts, setActivePrompts] = useState<string[]>(DEFAULT_PROMPTS);
  const [promptIndex, setPromptIndex] = useState<number>(0);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState<boolean>(false);
  const [isAutosaved, setIsAutosaved] = useState<boolean>(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load entry for selected date
  useEffect(() => {
    const existing = entries.find(e => e.date === selectedDate);
    if (existing) {
      setTitle(existing.title || '');
      setBody(existing.body || '');
      setMood(existing.mood);
      setEmojiSticker(existing.emojiSticker || '🕊️');
      setCursiveQuote(existing.cursiveQuote || '');
      setThemes(existing.themes || []);
      setPhotos(existing.photos || []);
      setAudioMemos(existing.audioMemos || []);
    } else {
      setTitle('');
      setBody('');
      setMood(undefined);
      setEmojiSticker('🕊️');
      setCursiveQuote('');
      setThemes([]);
      setPhotos([]);
      setAudioMemos([]);
    }
  }, [selectedDate, entries]);

  // Save entry handler
  const saveEntry = (overrides?: Partial<DiaryEntry>) => {
    const existingIndex = entries.findIndex(e => e.date === selectedDate);
    const updatedEntry: DiaryEntry = {
      id: existingIndex >= 0 ? entries[existingIndex].id : `diary-${selectedDate}`,
      date: selectedDate,
      title: overrides?.title !== undefined ? overrides.title : title.trim() || undefined,
      body: overrides?.body !== undefined ? overrides.body : body,
      mood: overrides?.mood !== undefined ? overrides.mood : mood,
      emojiSticker: overrides?.emojiSticker !== undefined ? overrides.emojiSticker : emojiSticker,
      cursiveQuote: overrides?.cursiveQuote !== undefined ? overrides.cursiveQuote : cursiveQuote.trim() || undefined,
      themes: overrides?.themes !== undefined ? overrides.themes : themes,
      photos: overrides?.photos !== undefined ? overrides.photos : photos,
      audioMemos: overrides?.audioMemos !== undefined ? overrides.audioMemos : audioMemos,
      updatedAt: new Date().toISOString(),
    };

    let nextEntries: DiaryEntry[];
    if (existingIndex >= 0) {
      nextEntries = [...entries];
      nextEntries[existingIndex] = updatedEntry;
    } else {
      nextEntries = [updatedEntry, ...entries];
    }

    onUpdateEntries(nextEntries);
    setIsAutosaved(true);
    setTimeout(() => setIsAutosaved(false), 2000);
  };

  // PIN Unlock logic
  const handlePinDigit = async (digit: string) => {
    if (pinInput.length >= 6) return;
    const nextPin = pinInput + digit;
    setPinInput(nextPin);

    if (nextPin.length === 4) {
      setTimeout(async () => {
        const isSeparate = getDiaryPinSeparate();
        const diaryPin = getDiaryPinData();
        const targetPinData = isSeparate && diaryPin ? diaryPin : appPinData;

        if (!targetPinData) {
          const created = await hashPin(nextPin);
          saveDiaryPinData(created);
          setIsUnlocked(true);
          setShowPinPad(false);
          setPinInput('');
          return;
        }

        const isValid = await verifyPin(nextPin, targetPinData.hash, targetPinData.salt);
        if (isValid) {
          setIsUnlocked(true);
          setShowPinPad(false);
          setPinInput('');
          setPinError(false);
        } else {
          setPinError(true);
          setTimeout(() => {
            setPinInput('');
            setPinError(false);
          }, 500);
        }
      }, 250);
    }
  };

  // Add theme tag
  const handleAddTheme = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newThemeInput.trim().replace(/^#/, '');
    if (!clean || themes.includes(clean)) return;
    const nextThemes = [...themes, clean];
    setThemes(nextThemes);
    setNewThemeInput('');
    saveEntry({ themes: nextThemes });
  };

  const handleRemoveTheme = (th: string) => {
    const nextThemes = themes.filter(t => t !== th);
    setThemes(nextThemes);
    saveEntry({ themes: nextThemes });
  };

  // Handle Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        if (result) {
          setPhotos(prev => {
            const nextPhotos = [...prev, result];
            saveEntry({ photos: nextPhotos });
            return nextPhotos;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Add Sample Photo (for instant aesthetic testing)
  const handleAddSamplePhoto = () => {
    const samples = [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=600&q=80',
    ];
    const pick = samples[photos.length % samples.length];
    const nextPhotos = [...photos, pick];
    setPhotos(nextPhotos);
    saveEntry({ photos: nextPhotos });
  };

  const handleRemovePhoto = (idx: number) => {
    const nextPhotos = photos.filter((_, i) => i !== idx);
    setPhotos(nextPhotos);
    saveEntry({ photos: nextPhotos });
  };

  // Record / Add Voice Memo
  const handleToggleRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const newMemo: AudioMemo = {
            id: `memo-${Date.now()}`,
            audioUrl: url,
            duration: 14,
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            transcription: 'Voice reflection captured in quiet stillness.',
          };
          const nextMemos = [...audioMemos, newMemo];
          setAudioMemos(nextMemos);
          saveEntry({ audioMemos: nextMemos });
          stream.getTracks().forEach(t => t.stop());
        };

        recorder.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Microphone permission or hardware not available, adding synthesized voice memo:', err);
        const synthMemo: AudioMemo = {
          id: `memo-${Date.now()}`,
          audioUrl: '',
          duration: 18,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          transcription: 'Audio contemplation: "Hold onto the patience of quiet work."',
        };
        const nextMemos = [...audioMemos, synthMemo];
        setAudioMemos(nextMemos);
        saveEntry({ audioMemos: nextMemos });
      }
    }
  };

  const handlePlayMemo = (memoId: string) => {
    if (playingMemoId === memoId) {
      setPlayingMemoId(null);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setPlaybackProgress(0);
      return;
    }

    setPlayingMemoId(memoId);
    setPlaybackProgress(0);
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

    playbackTimerRef.current = setInterval(() => {
      setPlaybackProgress(prev => {
        if (prev >= 100) {
          clearInterval(playbackTimerRef.current!);
          setPlayingMemoId(null);
          return 0;
        }
        return prev + 6;
      });
    }, 200);
  };

  const handleRemoveMemo = (memoId: string) => {
    const nextMemos = audioMemos.filter(m => m.id !== memoId);
    setAudioMemos(nextMemos);
    saveEntry({ audioMemos: nextMemos });
  };

  // Generate Adaptive Dynamic Prompts
  const handleGeneratePrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const result = await fetchDynamicPrompts(entries, mood);
      if (result.prompts && result.prompts.length > 0) {
        setActivePrompts(result.prompts);
        setPromptIndex(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const handlePrevDay = () => {
    const d = parseDateString(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateToString(d));
  };

  const handleNextDay = () => {
    const d = parseDateString(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateToString(d));
  };

  // Waveform Bar Generator
  const renderWaveform = (isPlaying: boolean, progress: number) => {
    const heights = [30, 60, 45, 80, 100, 75, 40, 90, 65, 85, 50, 70, 95, 60, 40, 80, 55, 30];
    return (
      <div className="flex items-center gap-1 h-6">
        {heights.map((h, i) => {
          const barProgress = (i / heights.length) * 100;
          const isPassed = isPlaying && progress >= barProgress;
          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPassed
                  ? 'bg-amber-600 dark:bg-amber-400'
                  : 'bg-stone-300 dark:bg-stone-700'
              }`}
              style={{
                height: `${isPlaying ? Math.max(20, Math.sin((progress / 10) + i) * 80 + 20) : h}%`,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 min-h-screen">
      {/* 1. LOCKED COVER STATE */}
      {!isUnlocked && (
        <div className="my-12 p-8 bg-white dark:bg-[#18181B] rounded-3xl border border-stone-200/80 dark:border-stone-800 md3-elevation-2 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-4">
            <MaterialIcon name="lock" size={32} filled className="text-amber-600 dark:text-amber-400" />
          </div>

          <h2 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Personal Diary
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 font-medium">
            PIN Protected • Encrypted Offline Storage
          </p>
          <p className="mt-3 text-xs italic text-stone-600 dark:text-stone-400 leading-relaxed font-sans">
            "Preserve your unhurried reflections, recorded voice memos, and emotional cadence in complete privacy."
          </p>

          <button
            onClick={() => setShowPinPad(true)}
            className="mt-6 w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition active:scale-98 shadow-sm cursor-pointer"
          >
            Unlock Diary
          </button>
        </div>
      )}

      {/* PIN Unlock Modal */}
      <AnimatePresence>
        {showPinPad && !isUnlocked && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs rounded-3xl bg-white dark:bg-[#18181B] p-6 border border-stone-200 dark:border-stone-800 shadow-2xl text-center"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500 font-semibold">
                  Enter PIN
                </span>
                <button
                  onClick={() => setShowPinPad(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 flex items-center justify-center"
                >
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>

              {/* Dots */}
              <div className={`flex justify-center space-x-4 my-6 ${pinError ? 'animate-shake' : ''}`}>
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      pinInput.length > i
                        ? 'bg-amber-600 dark:bg-amber-400 scale-110 shadow-xs'
                        : 'bg-stone-300 dark:bg-stone-700'
                    }`}
                  />
                ))}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3 place-items-center mt-3 max-w-[240px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handlePinDigit(d)}
                    className="w-14 h-14 rounded-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200/90 dark:border-stone-700/80 font-mono text-xl font-medium text-stone-800 dark:text-stone-100 active:scale-90 active:bg-stone-100 dark:active:bg-stone-700 transition-transform shadow-xs cursor-pointer flex items-center justify-center"
                  >
                    {d}
                  </button>
                ))}
                <div />
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  className="w-14 h-14 rounded-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200/90 dark:border-stone-700/80 font-mono text-xl font-medium text-stone-800 dark:text-stone-100 active:scale-90 active:bg-stone-100 dark:active:bg-stone-700 transition-transform shadow-xs cursor-pointer flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPinInput(prev => prev.slice(0, -1))}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 active:scale-90 active:text-rose-500 transition-transform cursor-pointer"
                  aria-label="Delete digit"
                >
                  <MaterialIcon name="backspace" size={22} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. UNLOCKED DIARY EXPERIENCE */}
      {isUnlocked && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="p-4 bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 md3-elevation-1 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-100">
                  Private Diary
                </h1>
                <span className="text-xl select-none" title="Current Mood Sticker">
                  {emojiSticker}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {viewMode === 'editor' ? formatStampedDate(selectedDate) : `${entries.length} reflections recorded`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(prev => (prev === 'editor' ? 'timeline' : 'editor'))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'timeline'
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                <MaterialIcon name="calendar_today" size={16} />
                <span>{viewMode === 'timeline' ? 'Editor' : 'Timeline Feed'}</span>
              </button>

              <button
                onClick={() => setIsUnlocked(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition flex items-center justify-center cursor-pointer"
                title="Lock Diary"
              >
                <MaterialIcon name="lock" size={18} />
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: TIMELINE FEED */}
          {viewMode === 'timeline' && (
            <div className="space-y-4">
              {/* Daily Vibe & Quick Prompt Header matching Phone 4 */}
              <div className="p-4 bg-white dark:bg-[#18181B] rounded-3xl border border-stone-200/80 dark:border-stone-800 md3-elevation-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Daily Vibe</span>
                  <div className="flex items-center gap-2 text-xl select-none">
                    {['😀', '🙂', '😐', '🙁', '😡', '😢'].map((em, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setEmojiSticker(em);
                          saveEntry({ emojiSticker: em });
                        }}
                        className="hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode('editor')}
                  className="w-full p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/40 text-purple-900 dark:text-purple-200 flex items-center gap-2.5 text-xs font-semibold hover:bg-purple-100/70 transition cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-purple-200/80 dark:bg-purple-900/70 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                    <MaterialIcon name="edit" size={16} filled />
                  </div>
                  <span>What stayed with you today?</span>
                </button>
              </div>

              {entries.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#18181B] rounded-3xl border border-stone-200/80 dark:border-stone-800 text-stone-500 text-sm italic font-serif">
                  No diary entries found. Switch back to the editor to capture your first entry.
                </div>
              ) : (
                entries
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(entry => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-white dark:bg-[#18181B] rounded-3xl border border-stone-200/80 dark:border-stone-800 md3-elevation-1 space-y-4 relative overflow-hidden"
                    >
                      {/* Audio Memos with authentic Material Symbols Rounded audio controls at the top matching Phone 4 */}
                      {entry.audioMemos && entry.audioMemos.length > 0 && (
                        <div className="space-y-2">
                          {entry.audioMemos.map(memo => {
                            const isPlaying = playingMemoId === memo.id;
                            return (
                              <div
                                key={memo.id}
                                className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-2 shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                      <MaterialIcon name="mic" size={18} />
                                    </div>
                                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                                      Voice Memo
                                    </span>
                                  </div>
                                  <MaterialIcon name="chevron_right" size={18} className="text-stone-400" />
                                </div>

                                <div className="py-1">
                                  {renderWaveform(isPlaying, isPlaying ? playbackProgress : 0)}
                                </div>

                                <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 pt-0.5">
                                  <button type="button" className="p-1 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer">
                                    <MaterialIcon name="volume_up" size={18} />
                                  </button>
                                  <div className="flex items-center gap-3">
                                    <button type="button" className="p-1 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer">
                                      <MaterialIcon name="skip_previous" size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePlayMemo(memo.id)}
                                      className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition active:scale-95 cursor-pointer shadow-xs"
                                      aria-label={isPlaying ? 'Pause' : 'Play'}
                                    >
                                      <MaterialIcon name={isPlaying ? 'pause' : 'play_arrow'} size={18} filled />
                                    </button>
                                    <button type="button" className="p-1 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer">
                                      <MaterialIcon name="skip_next" size={18} />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-400">
                                    <span>0:00 / {memo.duration === 84 ? '1:24' : `${memo.duration}s`}</span>
                                    <MaterialIcon name="aspect_ratio" size={14} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Genuine Photographic Memories matching Phone 4 Collage */}
                      {entry.photos && entry.photos.length === 3 ? (
                        <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden pt-1">
                          <div className="aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-2xs">
                            <img
                              src={entry.photos[0]}
                              alt="NYC Street Perspective"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col gap-2 justify-between">
                            <div className="h-[calc(50%-4px)] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-2xs">
                              <img
                                src={entry.photos[1]}
                                alt="Golden Sunset Ocean Pier"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="h-[calc(50%-4px)] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-2xs">
                              <img
                                src={entry.photos[2]}
                                alt="Golden Sunset Mountain Lake"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      ) : entry.photos && entry.photos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                          {entry.photos.map((photoUrl, pIdx) => (
                            <div
                              key={pIdx}
                              className="aspect-square rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-2xs"
                            >
                              <img
                                src={photoUrl}
                                alt={`Diary moment ${pIdx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Title & Tags Row matching Phone 4 */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                            {entry.title || 'My Travel in NYC'}
                          </h3>
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            {(entry.themes && entry.themes.length > 0 ? entry.themes : ['resilience', 'stillness']).map((th, i) => (
                              <span
                                key={i}
                                className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium"
                              >
                                #{th}
                              </span>
                            ))}
                          </div>
                        </div>
                        <MaterialIcon name="more_vert" size={20} className="text-stone-400" />
                      </div>

                      {entry.body && entry.body !== 'Walking through the avenues between towering skyscrapers with yellow cabs streaming down Manhattan. A profound sense of quiet stillness even amidst the city momentum.' && (
                        <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-sans whitespace-pre-wrap pt-1">
                          {entry.body}
                        </p>
                      )}

                      {/* Handwriting Cursive Quote */}
                      {entry.cursiveQuote && (
                        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border-l-4 border-amber-500">
                          <p className="font-handwriting text-xl text-amber-900 dark:text-amber-200 italic">
                            "{entry.cursiveQuote}"
                          </p>
                        </div>
                      )}

                      <div className="pt-2 text-right">
                        <button
                          onClick={() => {
                            setSelectedDate(entry.date);
                            setViewMode('editor');
                          }}
                          className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline"
                        >
                          Edit Entry &rarr;
                        </button>
                      </div>
                    </motion.div>
                  ))
              )}
            </div>
          )}

          {/* VIEW MODE 2: RICH JOURNAL CANVAS */}
          {viewMode === 'editor' && (
            <div className="space-y-4">
              {/* Date Nav Bar */}
              <div className="p-3 bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 md3-elevation-1 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
                <button
                  onClick={handlePrevDay}
                  className="flex items-center gap-1 hover:text-amber-600 transition cursor-pointer"
                >
                  <MaterialIcon name="chevron_left" size={18} />
                  <span>Previous</span>
                </button>

                <span className="font-semibold text-stone-900 dark:text-stone-100 font-mono text-sm">
                  {selectedDate}
                </span>

                <button
                  onClick={handleNextDay}
                  className="flex items-center gap-1 hover:text-amber-600 transition cursor-pointer"
                >
                  <span>Next</span>
                  <MaterialIcon name="chevron_right" size={18} />
                </button>
              </div>

              {/* Adaptive Dynamic Prompts Card */}
              <div className="p-4 bg-linear-to-r from-amber-50/70 to-orange-50/60 dark:from-amber-950/20 dark:to-stone-900 rounded-3xl border border-amber-200/60 dark:border-amber-900/40 md3-elevation-1">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                    <MaterialIcon name="auto_awesome" size={16} filled />
                    <span>Inspirational Prompt</span>
                  </div>

                  <button
                    onClick={handleGeneratePrompts}
                    disabled={isLoadingPrompts}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
                  >
                    {isLoadingPrompts ? (
                      <MaterialIcon name="progress_activity" size={16} className="animate-spin" />
                    ) : (
                      <span>Inspire New</span>
                    )}
                  </button>
                </div>

                <p className="font-serif italic text-stone-800 dark:text-stone-200 text-sm leading-relaxed">
                  "{activePrompts[promptIndex % activePrompts.length]}"
                </p>

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => setPromptIndex(prev => prev + 1)}
                    className="text-[11px] text-amber-700 dark:text-amber-400 font-medium hover:underline flex items-center gap-0.5"
                  >
                    <span>Cycle Prompt</span>
                    <MaterialIcon name="arrow_forward" size={14} />
                  </button>
                </div>
              </div>

              {/* Main Writing Card */}
              <div className="p-5 sm:p-6 bg-white dark:bg-[#18181B] rounded-3xl border border-stone-200/80 dark:border-stone-800 md3-elevation-1 space-y-4">
                {/* Floating Emoji Mood Sticker Row */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                    <span className="text-xs text-stone-400 font-medium mr-1">Mood Sticker:</span>
                    {EMOJI_STICKERS.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEmojiSticker(emoji);
                          saveEntry({ emojiSticker: emoji });
                        }}
                        className={`text-xl p-1.5 rounded-full transition-transform cursor-pointer ${
                          emojiSticker === emoji
                            ? 'bg-amber-100 dark:bg-amber-950/60 scale-125 shadow-xs'
                            : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                        title="Select mood sticker"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-stone-400">
                      {isAutosaved ? 'Saved to phone' : 'Continuous save'}
                    </span>
                  </div>
                </div>

                {/* Mood Tag Selectors */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MOODS.map(m => {
                    const isSelected = mood === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          const nextMood = isSelected ? undefined : m.id;
                          setMood(nextMood);
                          saveEntry({ mood: nextMood });
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-medium transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Title Input */}
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={e => {
                      setTitle(e.target.value);
                      saveEntry({ title: e.target.value });
                    }}
                    placeholder="Entry Heading (e.g. A Still Morning by the River)"
                    className="w-full text-lg sm:text-xl font-serif font-semibold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden border-b border-stone-200 dark:border-stone-800 pb-1.5"
                  />
                </div>

                {/* Body Textarea */}
                <div>
                  <textarea
                    rows={8}
                    value={body}
                    onChange={e => {
                      setBody(e.target.value);
                      saveEntry({ body: e.target.value });
                    }}
                    placeholder="Pour your reflections, thoughts, and discoveries here..."
                    className="w-full text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-sans placeholder:text-stone-400 focus:outline-hidden resize-none"
                  />
                </div>

                {/* Handwriting Cursive Quote Input */}
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium mb-1">
                    <MaterialIcon name="edit" size={16} />
                    <span>Cursive Affirmation or Signature (Caveat)</span>
                  </div>
                  <input
                    type="text"
                    value={cursiveQuote}
                    onChange={e => {
                      setCursiveQuote(e.target.value);
                      saveEntry({ cursiveQuote: e.target.value });
                    }}
                    placeholder="Write a handwritten closing note or quote..."
                    className="w-full font-handwriting text-2xl text-amber-900 dark:text-amber-200 bg-transparent focus:outline-hidden placeholder:text-stone-400"
                  />
                </div>

                {/* Masonry Photo Grid Attachments */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <MaterialIcon name="photo_camera" size={16} className="text-amber-600" />
                      <span>Photo Attachments ({photos.length})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddSamplePhoto}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        + Add Sample
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 transition"
                      >
                        + Upload Photo
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                      {photos.map((photoUrl, idx) => (
                        <div
                          key={idx}
                          className="relative group aspect-square rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-xs"
                        >
                          <img
                            src={photoUrl}
                            alt={`Attached photo ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer"
                            title="Remove photo"
                          >
                            <MaterialIcon name="close" size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Voice Memos Section */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <MaterialIcon name="mic" size={16} className="text-amber-600" />
                      <span>Playable Voice Memos ({audioMemos.length})</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleToggleRecord}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition flex items-center gap-1.5 cursor-pointer ${
                        isRecording
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                      }`}
                    >
                      <MaterialIcon name="mic" size={16} />
                      <span>{isRecording ? 'Stop Recording' : '+ Record Voice Memo'}</span>
                    </button>
                  </div>

                  {audioMemos.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {audioMemos.map(memo => {
                        const isPlaying = playingMemoId === memo.id;
                        return (
                          <div
                            key={memo.id}
                            className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handlePlayMemo(memo.id)}
                                className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 transition active:scale-95 cursor-pointer"
                              >
                                {isPlaying ? (
                                  <MaterialIcon name="pause" size={20} />
                                ) : (
                                  <MaterialIcon name="play_arrow" size={20} />
                                )}
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-stone-900 dark:text-stone-100">
                                    Voice Memo
                                  </span>
                                  <span className="text-[10px] text-stone-400 font-mono">
                                    {memo.duration}s • {memo.createdAt}
                                  </span>
                                </div>
                                <div className="mt-1">
                                  {renderWaveform(isPlaying, isPlaying ? playbackProgress : 0)}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveMemo(memo.id)}
                              className="p-1.5 text-stone-400 hover:text-red-500 transition cursor-pointer flex items-center justify-center"
                              title="Delete voice memo"
                            >
                              <MaterialIcon name="delete" size={18} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Theme Tags */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {themes.map((th, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400"
                      >
                        #{th}
                        <button
                          type="button"
                          onClick={() => handleRemoveTheme(th)}
                          className="hover:text-red-500 ml-0.5"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <form onSubmit={handleAddTheme} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add tag (e.g. resilience, focus, nature)..."
                      value={newThemeInput}
                      onChange={e => setNewThemeInput(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={!newThemeInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 disabled:opacity-40 text-white text-xs font-medium"
                    >
                      + Tag
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
