import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialIcon } from './MaterialIcon';
import { QuickNote, DiaryEntry, StudyNote, Keepsake, AudioMemo } from '../types';
import { formatShortDate } from '../utils/date';
import { searchArchive, transcribeAudioMemo, ArchiveSearchResult } from '../utils/ai';

interface NotesViewProps {
  notes: QuickNote[];
  onUpdateNotes: (notes: QuickNote[]) => void;
  corpus?: {
    diaryEntries: DiaryEntry[];
    studyNotes: StudyNote[];
    keepsakes: Keepsake[];
  };
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onUpdateNotes,
  corpus = { diaryEntries: [], studyNotes: [], keepsakes: [] },
}) => {
  const [search, setSearch] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [audioMemos, setAudioMemos] = useState<AudioMemo[]>([]);
  const [sketches, setSketches] = useState<string[]>([]);

  // "Ask My Hub" Semantic Search state
  const [isSemanticSearchOpen, setIsSemanticSearchOpen] = useState<boolean>(false);
  const [semanticQuery, setSemanticQuery] = useState<string>('');
  const [semanticResult, setSemanticResult] = useState<ArchiveSearchResult | null>(null);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState<boolean>(false);

  // Audio recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sketch Canvas state
  const [isSketchOpen, setIsSketchOpen] = useState<boolean>(false);
  const sketchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [sketchColor, setSketchColor] = useState<string>('#1A1A1A');
  const [sketchBrushSize, setSketchBrushSize] = useState<number>(3);

  // Photo full preview modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Filter notes and sort pinned first, then by updatedAt desc
  const filteredNotes = notes
    .filter(n => {
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.map(n => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    onUpdateNotes(updated);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNotes(notes.filter(n => n.id !== id));
  };

  const handleOpenEdit = (n: QuickNote) => {
    setEditingId(n.id);
    setTitle(n.title);
    setBody(n.body);
    setCategory(n.category || '');
    setIsPinned(n.isPinned);
    setPhotos(n.photos || []);
    setAudioMemos(n.audioMemos || []);
    setSketches(n.sketches || []);
    setIsAdding(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setCategory('');
    setIsPinned(false);
    setPhotos([]);
    setAudioMemos([]);
    setSketches([]);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !body.trim() && photos.length === 0 && audioMemos.length === 0 && sketches.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    if (editingId) {
      const updated = notes.map(n =>
        n.id === editingId
          ? {
              ...n,
              title: title.trim() || 'Untitled Note',
              body: body.trim(),
              category: category.trim() || undefined,
              isPinned,
              photos,
              audioMemos,
              sketches,
              updatedAt: now,
            }
          : n
      );
      onUpdateNotes(updated);
    } else {
      const newNote: QuickNote = {
        id: 'note-' + Date.now(),
        title: title.trim() || 'Untitled Note',
        body: body.trim(),
        category: category.trim() || undefined,
        isPinned,
        photos,
        audioMemos,
        sketches,
        createdAt: now,
        updatedAt: now,
      };
      onUpdateNotes([newNote, ...notes]);
    }

    setIsAdding(false);
  };

  // Image upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotos(prev => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice recording handlers
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Audio analyser setup for waveform
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);

      // Draw waveform loop
      const drawWaveform = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.6;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillStyle = '#D97706';
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }

        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      };

      drawWaveform();
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access is required to record audio notes.');
    }
  };

  const stopRecordingAudio = () => {
    if (!mediaRecorderRef.current || !isRecordingAudio) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const duration = recordingSeconds;
    setIsRecordingAudio(false);
    setIsTranscribing(true);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        // Auto transcribe with Gemini API
        let transcriptionText = '';
        try {
          const transcribeRes = await transcribeAudioMemo(base64Audio, 'audio/webm');
          transcriptionText = transcribeRes.text;
        } catch (e) {
          console.warn('Transcription failed:', e);
        }

        const newAudioMemo: AudioMemo = {
          id: 'memo-' + Date.now(),
          audioUrl: base64Audio,
          duration: Math.max(duration, 1),
          transcription: transcriptionText || undefined,
          createdAt: new Date().toISOString(),
        };

        setAudioMemos(prev => [...prev, newAudioMemo]);
        setIsTranscribing(false);
      };

      reader.readAsDataURL(audioBlob);

      // Stop audio tracks
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };

    mediaRecorderRef.current.stop();
  };

  // Play audio memo
  const handlePlayAudio = (memo: AudioMemo) => {
    if (playingAudioId === memo.id && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    const audio = new Audio(memo.audioUrl);
    currentAudioRef.current = audio;
    setPlayingAudioId(memo.id);

    audio.onended = () => {
      setPlayingAudioId(null);
    };
    audio.play();
  };

  // Sketch Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawSketch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = sketchBrushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = sketchColor;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveSketch = () => {
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSketches(prev => [...prev, dataUrl]);
    setIsSketchOpen(false);
  };

  const clearSketchCanvas = () => {
    const canvas = sketchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // "Ask My Hub" Semantic Search execution
  const handleSemanticSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticQuery.trim() || isSearchingSemantic) return;

    setIsSearchingSemantic(true);
    try {
      const result = await searchArchive(semanticQuery, {
        quickNotes: notes,
        diaryEntries: corpus.diaryEntries,
        studyNotes: corpus.studyNotes,
        keepsakes: corpus.keepsakes,
      });
      setSemanticResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  return (
    <div className="min-h-full pb-32 pt-0 max-w-xl mx-auto relative font-sans">
      {/* SWISS MINIMALIST EDITORIAL HEADER */}
      <section className="relative overflow-hidden bg-[var(--color-surface)] px-6 py-6 border-b border-[var(--color-hairline)] select-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-muted)] font-medium">
              Notes & Fleeting Thoughts
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight mt-1 text-[var(--color-ink)]">
              Notebook
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSemanticSearchOpen(true)}
              className="px-3 py-1.5 rounded-full border border-[var(--color-saffron)] text-[var(--color-saffron)] bg-[var(--color-saffron)]/5 text-xs font-medium hover:bg-[var(--color-saffron)] hover:text-white transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <MaterialIcon name="auto_awesome" size={16} filled />
              <span>Ask My Hub</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-medium hover:opacity-90 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <MaterialIcon name="add" size={18} />
              <span>New Note</span>
            </button>
          </div>
        </div>
      </section>

      {/* Search Input Bar */}
      <div className="px-4 sm:px-6 mt-4">
        <div className="relative">
          <MaterialIcon name="search" size={18} className="absolute left-3 top-2.5 text-[var(--color-muted)]" />
          <input
            type="text"
            placeholder="Search notes by keyword, tag, or topic..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-card)] text-[var(--color-ink)] placeholder-[var(--color-muted)] text-xs focus:outline-none focus:border-[var(--color-saffron)]"
          />
        </div>
      </div>

      {/* Notes Grid */}
      <div className="px-4 sm:px-6 mt-4">
        {filteredNotes.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[var(--color-hairline)] rounded-2xl p-6 bg-[var(--color-card)]">
            <MaterialIcon name="description" size={32} className="text-[var(--color-muted)] mx-auto mb-2" />
            <h3 className="font-serif text-xl font-medium text-[var(--color-ink)]">
              Nothing written yet
            </h3>
            <p className="text-xs text-[var(--color-muted)] font-serif italic mt-1 max-w-xs mx-auto">
              Capture fleeting thoughts, ideas, voice notes, or sketches here.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 rounded-full bg-[var(--color-saffron)] text-white text-xs font-medium hover:opacity-90 transition active:scale-95 cursor-pointer"
            >
              Write First Note
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map(note => {
              const hasPhotos = note.photos && note.photos.length > 0;
              const hasAudio = note.audioMemos && note.audioMemos.length > 0;
              const hasSketches = note.sketches && note.sketches.length > 0;

              return (
                <div
                  key={note.id}
                  onClick={() => handleOpenEdit(note)}
                  className="p-4 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-card)] transition-all cursor-pointer group relative select-none hover:border-[var(--color-saffron)]/70 active:scale-[0.99] md3-elevation-1"
                >
                  {/* Pin Indicator */}
                  {note.isPinned && (
                    <div className="absolute top-3.5 right-3.5 text-[var(--color-saffron)]">
                      <MaterialIcon name="push_pin" size={16} filled />
                    </div>
                  )}

                  {/* Category & Date */}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-muted)] mb-1">
                    {note.category && (
                      <span className="uppercase tracking-wider px-1.5 py-0.2 rounded bg-[var(--color-paper)] text-[var(--color-ink)]">
                        {note.category}
                      </span>
                    )}
                    <span>{formatShortDate(note.createdAt.split('T')[0])}</span>
                  </div>

                  {/* Title & Body */}
                  <h4 className="font-serif text-base sm:text-lg font-medium text-[var(--color-ink)] leading-snug">
                    {note.title}
                  </h4>
                  {note.body && (
                    <p className="text-xs sm:text-sm text-[var(--color-muted)] font-sans line-clamp-3 mt-1 leading-relaxed whitespace-pre-wrap">
                      {note.body}
                    </p>
                  )}

                  {/* Rich Media Previews */}
                  {(hasPhotos || hasSketches || hasAudio) && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--color-hairline)] space-y-2">
                      {/* Attached Photos */}
                      {hasPhotos && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {note.photos!.map((photo, i) => (
                            <img
                              key={i}
                              src={photo}
                              alt="Note attachment"
                              className="w-14 h-14 rounded object-cover border border-[var(--color-hairline)] flex-shrink-0 cursor-pointer hover:opacity-90"
                              onClick={e => {
                                e.stopPropagation();
                                setPreviewPhotoUrl(photo);
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Attached Sketches */}
                      {hasSketches && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {note.sketches!.map((sketch, i) => (
                            <div
                              key={i}
                              className="w-14 h-14 rounded border border-[var(--color-hairline)] bg-white p-1 flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90"
                              onClick={e => {
                                e.stopPropagation();
                                setPreviewPhotoUrl(sketch);
                              }}
                            >
                              <img src={sketch} alt="Sketch drawing" className="max-w-full max-h-full object-contain" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Attached Voice Memos */}
                      {hasAudio && (
                        <div className="space-y-1.5">
                          {note.audioMemos!.map(memo => (
                            <div
                              key={memo.id}
                              onClick={e => {
                                e.stopPropagation();
                                handlePlayAudio(memo);
                              }}
                              className="flex items-center justify-between p-2 rounded bg-[var(--color-paper)] border border-[var(--color-hairline)] text-xs text-[var(--color-ink)] hover:border-[var(--color-saffron)] transition"
                            >
                              <div className="flex items-center gap-2">
                                <button className="w-6 h-6 rounded-full bg-[var(--color-saffron)] text-white flex items-center justify-center flex-shrink-0">
                                  {playingAudioId === memo.id ? (
                                    <MaterialIcon name="pause" size={14} />
                                  ) : (
                                    <MaterialIcon name="play_arrow" size={14} />
                                  )}
                                </button>
                                <span className="font-mono text-[11px] text-[var(--color-muted)]">
                                  {memo.duration}s Voice Memo
                                </span>
                              </div>
                              {memo.transcription && (
                                <span className="text-[11px] text-[var(--color-muted)] italic truncate max-w-[200px]">
                                  "{memo.transcription}"
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)] pt-1 border-t border-[var(--color-hairline)]">
                    <span className="font-mono text-[10px]">
                      {hasPhotos ? `${note.photos!.length} photo${note.photos!.length > 1 ? 's' : ''}` : ''}
                      {hasAudio ? ` • ${note.audioMemos!.length} audio` : ''}
                      {hasSketches ? ` • ${note.sketches!.length} sketch` : ''}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => handleTogglePin(note.id, e)}
                        className={`p-1 rounded hover:text-[var(--color-ink)] flex items-center justify-center ${
                          note.isPinned ? 'text-[var(--color-saffron)]' : ''
                        }`}
                        title={note.isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        <MaterialIcon name="push_pin" size={16} filled={note.isPinned} />
                      </button>
                      <button
                        onClick={e => handleDelete(note.id, e)}
                        className="p-1 rounded hover:text-red-600 flex items-center justify-center"
                        title="Delete note"
                      >
                        <MaterialIcon name="delete" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleOpenCreate}
        className="fixed bottom-20 right-5 sm:right-8 z-30 w-14 h-14 rounded-full bg-[var(--color-saffron)] text-white shadow-lg hover:opacity-95 active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-white/20"
        aria-label="New Note"
      >
        <MaterialIcon name="add" size={26} />
      </button>

      {/* Edit / Create Note Modal with Rich Media toolbar */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-5 border border-[var(--color-hairline)] shadow-xl max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
                <h3 className="font-serif text-xl font-medium tracking-tight">
                  {editingId ? 'Edit Note' : 'New Note'}
                </h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer flex items-center justify-center"
                >
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-3.5">
                <div>
                  <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[var(--color-hairline)] bg-[var(--color-paper)] font-serif text-base sm:text-lg focus:outline-none focus:border-[var(--color-saffron)] text-[var(--color-ink)]"
                  />
                </div>

                <div>
                  <textarea
                    rows={5}
                    placeholder="Write your note, principle, or thoughts..."
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs sm:text-sm focus:outline-none focus:border-[var(--color-saffron)] text-[var(--color-ink)] font-sans leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Category / Tag (optional)"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs font-mono focus:outline-none focus:border-[var(--color-saffron)] text-[var(--color-ink)]"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={e => setIsPinned(e.target.checked)}
                      className="rounded text-[var(--color-saffron)] focus:ring-0"
                    />
                    <MaterialIcon name="push_pin" size={16} filled={isPinned} />
                    <span>Pin</span>
                  </label>
                </div>

                {/* RICH MEDIA TOOLBAR: Photo, Audio Voice Memo, Canvas Sketch */}
                <div className="pt-2 border-t border-[var(--color-hairline)]">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-[var(--color-muted)] mb-2 font-semibold">
                    Attach Rich Media
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Add Photo */}
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)] hover:border-[var(--color-saffron)] transition cursor-pointer">
                      <MaterialIcon name="photo_camera" size={16} className="text-[var(--color-muted)]" />
                      <span>Attach Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Voice Memo Recorder */}
                    {!isRecordingAudio ? (
                      <button
                        type="button"
                        onClick={startRecordingAudio}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)] hover:border-[var(--color-saffron)] transition cursor-pointer"
                      >
                        <MaterialIcon name="mic" size={16} className="text-[var(--color-saffron)]" />
                        <span>Record Voice</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecordingAudio}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-medium animate-pulse transition cursor-pointer"
                      >
                        <MaterialIcon name="stop" size={16} filled />
                        <span>Stop ({recordingSeconds}s)</span>
                      </button>
                    )}

                    {/* Sketch Canvas */}
                    <button
                      type="button"
                      onClick={() => setIsSketchOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)] hover:border-[var(--color-saffron)] transition cursor-pointer"
                    >
                      <MaterialIcon name="draw" size={16} className="text-[var(--color-teal)]" />
                      <span>Draw Sketch</span>
                    </button>
                  </div>

                  {/* Audio recording visualizer */}
                  {isRecordingAudio && (
                    <div className="mt-2 p-2 rounded-2xl bg-[var(--color-paper)] border border-[var(--color-hairline)] flex items-center gap-3">
                      <canvas
                        ref={canvasRef}
                        width={200}
                        height={24}
                        className="w-full h-6 rounded bg-transparent"
                      />
                      <span className="font-mono text-xs text-[var(--color-saffron)] tabular-nums flex-shrink-0">
                        00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                      </span>
                    </div>
                  )}

                  {isTranscribing && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted)] font-mono">
                      <MaterialIcon name="progress_activity" size={16} className="animate-spin text-[var(--color-saffron)]" />
                      <span>Transcribing voice note with Gemini AI...</span>
                    </div>
                  )}

                  {/* Attached media preview inside edit modal */}
                  {(photos.length > 0 || sketches.length > 0 || audioMemos.length > 0) && (
                    <div className="mt-3 space-y-2">
                      {/* Photos */}
                      {photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {photos.map((p, idx) => (
                            <div key={idx} className="relative group/thumb flex-shrink-0">
                              <img src={p} alt="Attachment" className="w-14 h-14 rounded object-cover border border-[var(--color-hairline)]" />
                              <button
                                type="button"
                                onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sketches */}
                      {sketches.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {sketches.map((s, idx) => (
                            <div key={idx} className="relative group/thumb flex-shrink-0">
                              <div className="w-14 h-14 rounded bg-white p-1 border border-[var(--color-hairline)] flex items-center justify-center">
                                <img src={s} alt="Sketch" className="max-w-full max-h-full object-contain" />
                              </div>
                              <button
                                type="button"
                                onClick={() => setSketches(sketches.filter((_, i) => i !== idx))}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Audio Memos */}
                      {audioMemos.length > 0 && (
                        <div className="space-y-1">
                          {audioMemos.map((memo, idx) => (
                            <div key={memo.id} className="flex items-center justify-between p-2 rounded bg-[var(--color-paper)] border border-[var(--color-hairline)] text-xs">
                              <div className="flex items-center gap-2">
                                <MaterialIcon name="volume_up" size={16} className="text-[var(--color-saffron)]" />
                                <span className="font-mono text-[11px]">{memo.duration}s voice memo</span>
                                {memo.transcription && (
                                  <span className="italic text-[11px] text-[var(--color-muted)] truncate max-w-[150px]">
                                    "{memo.transcription}"
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setAudioMemos(audioMemos.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-[var(--color-saffron)] text-white text-xs font-mono uppercase tracking-wider font-semibold hover:opacity-90 transition active:scale-95 cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SKETCH CANVAS MODAL */}
      <AnimatePresence>
        {isSketchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-lg bg-[var(--color-card)] text-[var(--color-ink)] p-4 border border-[var(--color-hairline)] shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-hairline)]">
                <h3 className="font-serif text-lg font-medium">Draw Sketch</h3>
                <button onClick={() => setIsSketchOpen(false)} className="p-1 text-[var(--color-muted)] flex items-center justify-center cursor-pointer">
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>

              {/* Canvas controls */}
              <div className="py-2 flex items-center justify-between text-xs">
                {/* Colors */}
                <div className="flex items-center gap-1.5">
                  {['#1A1A1A', '#D97706', '#0F766E', '#C2410C'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSketchColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        sketchColor === c ? 'border-black scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* Brush size */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[var(--color-muted)]">Size:</span>
                  {[2, 4, 8].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSketchBrushSize(s)}
                      className={`px-2 py-0.5 rounded border text-xs font-mono ${
                        sketchBrushSize === s ? 'bg-[var(--color-ink)] text-white' : 'border-[var(--color-hairline)]'
                      }`}
                    >
                      {s}px
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearSketchCanvas}
                    className="ml-2 text-xs text-[var(--color-muted)] hover:text-red-600 underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Drawing Surface */}
              <div className="border border-[var(--color-hairline)] rounded bg-white overflow-hidden touch-none">
                <canvas
                  ref={sketchCanvasRef}
                  width={380}
                  height={260}
                  className="w-full h-[240px] cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={drawSketch}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={drawSketch}
                  onTouchEnd={stopDrawing}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSketchOpen(false)}
                  className="px-3 py-1.5 text-xs text-[var(--color-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSketch}
                  className="px-4 py-1.5 rounded bg-[var(--color-saffron)] text-white text-xs font-medium"
                >
                  Attach Sketch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PHOTO PREVIEW MODAL */}
      <AnimatePresence>
        {previewPhotoUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewPhotoUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-lg max-h-[85vh] bg-white rounded-lg p-2 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <img src={previewPhotoUrl} alt="Enlarged preview" className="max-w-full max-h-[80vh] object-contain rounded" />
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <MaterialIcon name="close" size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* "ASK MY HUB" SEMANTIC SEARCH DIALOG */}
      <AnimatePresence>
        {isSemanticSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-lg rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-5 border border-[var(--color-hairline)] shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="auto_awesome" size={20} filled className="text-[var(--color-saffron)]" />
                  <h3 className="font-serif text-xl font-medium">Ask My Hub</h3>
                </div>
                <button
                  onClick={() => setIsSemanticSearchOpen(false)}
                  className="p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)] flex items-center justify-center cursor-pointer"
                >
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>

              <p className="text-xs text-[var(--color-muted)] font-serif italic mt-2">
                Converse with your past journals, notes, study materials, and keepsakes to surface hidden connections.
              </p>

              <form onSubmit={handleSemanticSearchSubmit} className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. What have I written about creative habits and daily rituals?"
                  value={semanticQuery}
                  onChange={e => setSemanticQuery(e.target.value)}
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs focus:outline-none focus:border-[var(--color-saffron)] text-[var(--color-ink)]"
                  disabled={isSearchingSemantic}
                />
                <button
                  type="submit"
                  disabled={!semanticQuery.trim() || isSearchingSemantic}
                  className="px-4 py-2 rounded-full bg-[var(--color-saffron)] text-white text-xs font-medium disabled:opacity-40 hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSearchingSemantic ? (
                    <MaterialIcon name="progress_activity" size={16} className="animate-spin" />
                  ) : (
                    <span>Ask</span>
                  )}
                </button>
              </form>

              {/* Semantic Response */}
              {semanticResult && (
                <div className="mt-4 pt-4 border-t border-[var(--color-hairline)] space-y-3">
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)] mb-1 font-semibold">
                      Synthesized Insight
                    </h4>
                    <p className="font-serif text-sm sm:text-base text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
                      {semanticResult.answer}
                    </p>
                  </div>

                  {semanticResult.sources && semanticResult.sources.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)] font-semibold">
                        Referenced Sources ({semanticResult.sources.length})
                      </h4>
                      {semanticResult.sources.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded bg-[var(--color-paper)] border border-[var(--color-hairline)] text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px] text-[var(--color-muted)]">
                            <span className="font-semibold text-[var(--color-ink)]">{s.title}</span>
                            <span className="uppercase">{s.type} {s.date ? `• ${s.date}` : ''}</span>
                          </div>
                          <p className="text-[var(--color-muted)] italic text-[11px] line-clamp-2">
                            "{s.excerpt}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
