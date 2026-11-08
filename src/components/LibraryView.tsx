import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialIcon } from './MaterialIcon';
import { BookOutlineIcon, RealisticOpenBook, RealisticVintageCamera } from './VisualAssets';
import { Routine, StudyNote, Keepsake, KeepsakeType } from '../types';
import { formatShortDate } from '../utils/date';
import { fetchThematicAnalysis, ThematicAnalysisResult } from '../utils/ai';

interface LibraryViewProps {
  routines: Routine[];
  studyNotes: StudyNote[];
  keepsakes: Keepsake[];
  onUpdateRoutines: (routines: Routine[]) => void;
  onUpdateStudyNotes: (notes: StudyNote[]) => void;
  onUpdateKeepsakes: (keepsakes: Keepsake[]) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  routines,
  studyNotes,
  keepsakes,
  onUpdateRoutines,
  onUpdateStudyNotes,
  onUpdateKeepsakes,
}) => {
  const [activeShelf, setActiveShelf] = useState<'overview' | 'routines' | 'study' | 'keepsakes'>('overview');
  const [librarySearch, setLibrarySearch] = useState<string>('');

  // AI Thematic Analyzer state
  const [isThematicModalOpen, setIsThematicModalOpen] = useState<boolean>(false);
  const [thematicResult, setThematicResult] = useState<ThematicAnalysisResult | null>(null);
  const [isLoadingThematic, setIsLoadingThematic] = useState<boolean>(false);

  // Routines state
  const [isAddingRoutine, setIsAddingRoutine] = useState<boolean>(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineTitle, setRoutineTitle] = useState<string>('');
  const [routineTime, setRoutineTime] = useState<string>('07:00');

  // Study Notes state
  const [isAddingStudy, setIsAddingStudy] = useState<boolean>(false);
  const [studyTitle, setStudyTitle] = useState<string>('');
  const [studyBody, setStudyBody] = useState<string>('');
  const [studyTags, setStudyTags] = useState<string>('');
  const [viewingStudyNote, setViewingStudyNote] = useState<StudyNote | null>(null);

  // Keepsakes state
  const [isAddingKeepsake, setIsAddingKeepsake] = useState<boolean>(false);
  const [newKsType, setNewKsType] = useState<KeepsakeType>('conviction');
  const [newKsText, setNewKsText] = useState<string>('');
  const [newKsSource, setNewKsSource] = useState<string>('');
  const [newKsTags, setNewKsTags] = useState<string>('');

  // Thematic Analyzer trigger
  const handleOpenThematicAnalyzer = async () => {
    setIsThematicModalOpen(true);
    setIsLoadingThematic(true);
    try {
      const result = await fetchThematicAnalysis({
        routines,
        studyNotes,
        keepsakes,
      });
      setThematicResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingThematic(false);
    }
  };

  // Routine Handlers
  const handleSaveRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineTitle.trim()) return;

    if (editingRoutineId) {
      const updated = routines.map(r =>
        r.id === editingRoutineId ? { ...r, title: routineTitle.trim(), time: routineTime } : r
      );
      onUpdateRoutines(updated);
    } else {
      const newRoutine: Routine = {
        id: 'r-' + Date.now(),
        title: routineTitle.trim(),
        time: routineTime,
        order: routines.length + 1,
      };
      onUpdateRoutines([...routines, newRoutine]);
    }
    setRoutineTitle('');
    setRoutineTime('07:00');
    setEditingRoutineId(null);
    setIsAddingRoutine(false);
  };

  // Study Note Handlers
  const handleSaveStudyNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyTitle.trim() && !studyBody.trim()) return;

    const tagsArray = studyTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const now = new Date().toISOString();
    const newNote: StudyNote = {
      id: 'sn-' + Date.now(),
      title: studyTitle.trim() || 'Untitled Study',
      body: studyBody.trim(),
      tags: tagsArray,
      createdAt: now,
      updatedAt: now,
    };

    onUpdateStudyNotes([newNote, ...studyNotes]);
    setStudyTitle('');
    setStudyBody('');
    setStudyTags('');
    setIsAddingStudy(false);
  };

  // Keepsake Handlers
  const handleSaveKeepsake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKsText.trim()) return;

    const tagsArray = newKsTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const item: Keepsake = {
      id: 'ks-' + Date.now(),
      type: newKsType,
      text: newKsText.trim(),
      source: newKsSource.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      tags: tagsArray,
    };

    onUpdateKeepsakes([item, ...keepsakes]);
    setNewKsText('');
    setNewKsSource('');
    setNewKsTags('');
    setIsAddingKeepsake(false);
  };

  return (
    <div className="min-h-full pb-36 pt-2 max-w-xl mx-auto px-4 sm:px-6 relative font-sans space-y-4">
      {/* TOP BAR: Search Input & Prominent "Thematic Analyzer" Action Button */}
      <section className="bg-[var(--color-surface)] rounded-3xl p-4 md3-elevation-1 border border-[var(--color-hairline)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-muted)] font-medium">
              Archives & Shelf
            </span>
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] leading-none mt-0.5">
              Visual Library
            </h2>
          </div>

          <button
            onClick={handleOpenThematicAnalyzer}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold shadow-sm hover:opacity-95 transition active:scale-95 cursor-pointer"
          >
            <MaterialIcon name="bar_chart" size={18} filled />
            <span>Thematic Analyser</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MaterialIcon name="search" size={18} className="absolute left-3.5 top-2.5 text-[var(--color-muted)]" />
          <input
            type="text"
            value={librarySearch}
            onChange={e => setLibrarySearch(e.target.value)}
            placeholder="Search across routines, study notes & keepsakes..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-saffron)]"
          />
        </div>
      </section>

      {/* OVERVIEW OR DETAIL VIEW */}
      {activeShelf === 'overview' ? (
        <section className="space-y-4">
          {/* ARCHIVE BOOK 1: DAILY ROUTINES (Elevated Teal Gradient Card matching Phone 2) */}
          <div
            onClick={() => setActiveShelf('routines')}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-900 text-white p-6 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99] border border-teal-500/30 min-h-[160px] flex flex-col justify-between"
          >
            {/* Hanging Yellow Bookmark Ribbon */}
            <div className="absolute top-0 right-7 w-6 h-12 bg-amber-400 shadow-md flex flex-col justify-end z-10">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[8px] border-b-teal-700" />
            </div>

            <div>
              <BookOutlineIcon size={30} className="text-white mb-2 stroke-[2.2]" />
              <span className="font-serif text-3xl font-light text-teal-100 tracking-widest block leading-none">
                I
              </span>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="font-serif text-2xl font-bold text-white tracking-tight">
                  Daily Routines
                </h3>
                <MaterialIcon name="chevron_right" size={22} className="text-teal-200" />
              </div>
            </div>

            {/* Bottom row with 336 habits pill */}
            <div className="mt-4 flex items-center justify-end">
              <div className="px-4 py-1.5 rounded-full bg-white text-teal-950 font-bold text-xs shadow-md tracking-tight">
                336 habits
              </div>
            </div>
          </div>

          {/* ARCHIVE BOOK 2: STUDY NOTES (Elevated Soft Blue Gradient Card with Realistic Open Book matching Phone 2) */}
          <div
            onClick={() => setActiveShelf('study')}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-900 text-white p-6 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99] border border-sky-500/30 min-h-[175px] flex flex-col justify-between"
          >
            {/* Hanging Yellow Bookmark Ribbon */}
            <div className="absolute top-0 right-7 w-6 h-12 bg-amber-400 shadow-md flex flex-col justify-end z-10">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[8px] border-b-blue-700" />
            </div>

            <div className="relative z-10 pr-16">
              <BookOutlineIcon size={30} className="text-white mb-2 stroke-[2.2]" />
              <span className="font-serif text-3xl font-light text-sky-100 tracking-widest block leading-none">
                II
              </span>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="font-serif text-2xl font-bold text-white tracking-tight">
                  Study Notes
                </h3>
                <MaterialIcon name="chevron_right" size={22} className="text-sky-200" />
              </div>

              {/* Tag Capsules matching Phone 2 */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-medium backdrop-blur-xs">
                  Key Tags
                </span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-medium backdrop-blur-xs">
                  Review
                </span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-medium backdrop-blur-xs">
                  Key Tags
                </span>
              </div>
            </div>

            {/* Realistic Open Book Graphic in bottom-right corner */}
            <RealisticOpenBook className="w-28 h-20 absolute right-3 bottom-2 z-10" />
          </div>

          {/* ARCHIVE BOOK 3: PERSONAL KEEPSAKES (Elevated Purple Gradient Card with Realistic Vintage Camera matching Phone 2) */}
          <div
            onClick={() => setActiveShelf('keepsakes')}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-800 to-slate-900 text-white p-6 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99] border border-purple-500/30 min-h-[175px] flex flex-col justify-between"
          >
            {/* Hanging Yellow Bookmark Ribbon */}
            <div className="absolute top-0 right-7 w-6 h-12 bg-amber-400 shadow-md flex flex-col justify-end z-10">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[8px] border-b-purple-800" />
            </div>

            <div className="relative z-10 pr-24">
              <BookOutlineIcon size={30} className="text-white mb-2 stroke-[2.2]" />
              <span className="font-serif text-3xl font-light text-purple-100 tracking-widest block leading-none">
                III
              </span>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="font-serif text-2xl font-bold text-white tracking-tight">
                  Personal Keepsakes
                </h3>
              </div>
            </div>

            {/* Realistic Vintage 35mm Rangefinder Camera Graphic in bottom-right corner */}
            <RealisticVintageCamera className="w-28 h-20 absolute right-3 bottom-2 z-10" />
          </div>
        </section>
      ) : activeShelf === 'routines' ? (
        /* ROUTINES BOOK DETAIL VIEW */
        <section className="bg-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-hairline)] md3-elevation-1 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
            <button
              onClick={() => setActiveShelf('overview')}
              className="flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              <MaterialIcon name="arrow_back" size={18} />
              <span>Back to Library</span>
            </button>
            <button
              onClick={() => {
                setEditingRoutineId(null);
                setRoutineTitle('');
                setRoutineTime('07:00');
                setIsAddingRoutine(true);
              }}
              className="px-3.5 py-1.5 rounded-full bg-teal-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <MaterialIcon name="add" size={18} />
              <span>Add Routine</span>
            </button>
          </div>

          <div>
            <span className="text-xs font-mono text-teal-600 font-bold uppercase">Volume I</span>
            <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)]">Daily Routines</h3>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Fixed habits copied directly to Today's schedule with one tap.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {routines.map(routine => (
              <div
                key={routine.id}
                className="p-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-950 px-2 py-1 rounded-lg">
                    {routine.time}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-ink)]">
                    {routine.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingRoutineId(routine.id);
                      setRoutineTitle(routine.title);
                      setRoutineTime(routine.time);
                      setIsAddingRoutine(true);
                    }}
                    className="p-1.5 text-[var(--color-muted)] hover:text-teal-600 flex items-center justify-center cursor-pointer"
                    aria-label="Edit routine"
                  >
                    <MaterialIcon name="edit" size={16} />
                  </button>
                  <button
                    onClick={() => onUpdateRoutines(routines.filter(r => r.id !== routine.id))}
                    className="p-1.5 text-[var(--color-muted)] hover:text-red-500 flex items-center justify-center cursor-pointer"
                    aria-label="Delete routine"
                  >
                    <MaterialIcon name="delete" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : activeShelf === 'study' ? (
        /* STUDY NOTES BOOK DETAIL VIEW */
        <section className="bg-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-hairline)] md3-elevation-1 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
            <button
              onClick={() => setActiveShelf('overview')}
              className="flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              <MaterialIcon name="arrow_back" size={18} />
              <span>Back to Library</span>
            </button>
            <button
              onClick={() => {
                setStudyTitle('');
                setStudyBody('');
                setStudyTags('');
                setIsAddingStudy(true);
              }}
              className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <MaterialIcon name="add" size={18} />
              <span>New Study Note</span>
            </button>
          </div>

          <div>
            <span className="text-xs font-mono text-blue-600 font-bold uppercase">Volume II</span>
            <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)]">Study Notes</h3>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Long-term knowledge inquiries, readings, and reflections.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {studyNotes.map(note => (
              <div
                key={note.id}
                onClick={() => setViewingStudyNote(note)}
                className="p-4 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] hover:border-blue-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-muted)] mb-1">
                  <span>{formatShortDate(note.createdAt.split('T')[0])}</span>
                  <div className="flex gap-1">
                    {note.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <h4 className="font-serif text-base font-semibold text-[var(--color-ink)]">
                  {note.title}
                </h4>
                <p className="text-xs text-[var(--color-muted)] line-clamp-3 mt-1 leading-relaxed">
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        /* KEEPSAKES BOOK DETAIL VIEW */
        <section className="bg-[var(--color-surface)] rounded-3xl p-5 border border-[var(--color-hairline)] md3-elevation-1 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
            <button
              onClick={() => setActiveShelf('overview')}
              className="flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              <MaterialIcon name="arrow_back" size={18} />
              <span>Back to Library</span>
            </button>
            <button
              onClick={() => {
                setNewKsText('');
                setNewKsSource('');
                setNewKsTags('');
                setIsAddingKeepsake(true);
              }}
              className="px-3.5 py-1.5 rounded-full bg-purple-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <MaterialIcon name="add" size={18} />
              <span>Add Keepsake</span>
            </button>
          </div>

          <div>
            <span className="text-xs font-mono text-purple-600 font-bold uppercase">Volume III</span>
            <h3 className="font-serif text-2xl font-bold text-[var(--color-ink)]">Personal Keepsakes</h3>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Unanchored quotes, rhema, and convictions that steady your soul.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {keepsakes.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] space-y-2 relative"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-muted)]">
                  <span className="uppercase font-semibold tracking-wider text-purple-600 dark:text-purple-400">
                    {item.type}
                  </span>
                  <span>{item.date}</span>
                </div>
                <p className="font-serif text-sm sm:text-base italic text-[var(--color-ink)] leading-relaxed">
                  "{item.text}"
                </p>
                {item.source && (
                  <p className="text-xs font-mono text-[var(--color-muted)] text-right">
                    — {item.source}
                  </p>
                )}
                <button
                  onClick={() => onUpdateKeepsakes(keepsakes.filter(k => k.id !== item.id))}
                  className="absolute bottom-3 left-3 p-1 text-[var(--color-muted)] hover:text-red-500 flex items-center justify-center cursor-pointer"
                  aria-label="Delete keepsake"
                >
                  <MaterialIcon name="delete" size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODAL: AI THEMATIC ANALYZER */}
      <AnimatePresence>
        {isThematicModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="auto_awesome" size={20} filled className="text-amber-500" />
                  <h3 className="font-serif text-xl font-bold">AI Thematic Analyzer</h3>
                </div>
                <button onClick={() => setIsThematicModalOpen(false)} className="p-1 text-[var(--color-muted)] flex items-center justify-center cursor-pointer">
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>

              {isLoadingThematic ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <MaterialIcon name="progress_activity" size={28} className="text-amber-500 animate-spin" />
                  <p className="font-serif text-sm text-[var(--color-muted)] italic">
                    Synthesizing themes across Daily Routines, Study Notes, and Keepsakes...
                  </p>
                </div>
              ) : thematicResult ? (
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--color-paper)] border border-[var(--color-hairline)]">
                    <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)] font-semibold block mb-1">
                      Curatorial Overview
                    </span>
                    <p className="font-serif text-base sm:text-lg leading-relaxed text-[var(--color-ink)]">
                      "{thematicResult.overview}"
                    </p>
                  </div>

                  {thematicResult.themes && (
                    <div className="space-y-2">
                      <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)] font-semibold block">
                        Identified Motifs
                      </span>
                      {thematicResult.themes.map((th, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-[var(--color-paper)] border border-[var(--color-hairline)]">
                          <h5 className="font-serif text-sm font-bold text-[var(--color-ink)]">
                            {th.title}
                          </h5>
                          <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">
                            {th.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {thematicResult.curatorNote && (
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/50">
                      <span className="font-mono text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block mb-1">
                        Philosophy & Praxis
                      </span>
                      <p className="text-xs text-[var(--color-ink)] italic">
                        {thematicResult.curatorNote}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setIsThematicModalOpen(false)}
                      className="px-5 py-2 rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono uppercase tracking-wider font-semibold"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD ROUTINE */}
      <AnimatePresence>
        {isAddingRoutine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] shadow-2xl"
            >
              <h3 className="font-serif text-xl font-bold">
                {editingRoutineId ? 'Edit Routine' : 'Add Daily Routine'}
              </h3>
              <form onSubmit={handleSaveRoutine} className="mt-4 space-y-3">
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Stillness"
                  value={routineTitle}
                  onChange={e => setRoutineTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-sm"
                />
                <input
                  type="time"
                  required
                  value={routineTime}
                  onChange={e => setRoutineTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] font-mono text-sm"
                />
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAddingRoutine(false)} className="px-4 py-2 text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-full bg-teal-600 text-white text-xs font-semibold">
                    Save Routine
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD STUDY NOTE */}
      <AnimatePresence>
        {isAddingStudy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] shadow-2xl"
            >
              <h3 className="font-serif text-xl font-bold">New Study Note</h3>
              <form onSubmit={handleSaveStudyNote} className="mt-4 space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Inquiry Topic / Title"
                  value={studyTitle}
                  onChange={e => setStudyTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-sm"
                />
                <textarea
                  rows={6}
                  required
                  placeholder="Record summary observations, quotes, concepts..."
                  value={studyBody}
                  onChange={e => setStudyBody(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs leading-relaxed"
                />
                <input
                  type="text"
                  placeholder="Tags (e.g. Architecture, Focus, Hebrew)"
                  value={studyTags}
                  onChange={e => setStudyTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs font-mono"
                />
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAddingStudy(false)} className="px-4 py-2 text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold">
                    Save Note
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: VIEW STUDY NOTE */}
      <AnimatePresence>
        {viewingStudyNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
                <span className="font-mono text-xs text-[var(--color-muted)]">
                  {formatShortDate(viewingStudyNote.createdAt.split('T')[0])}
                </span>
                <button onClick={() => setViewingStudyNote(null)} className="p-1 text-[var(--color-muted)] flex items-center justify-center cursor-pointer">
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>
              <h3 className="font-serif text-2xl font-bold mt-3 text-[var(--color-ink)]">
                {viewingStudyNote.title}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 leading-relaxed whitespace-pre-wrap">
                {viewingStudyNote.body}
              </p>
              <div className="flex gap-1.5 flex-wrap mt-4 pt-3 border-t border-[var(--color-hairline)]">
                {viewingStudyNote.tags.map(t => (
                  <span key={t} className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    #{t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD KEEPSAKE */}
      <AnimatePresence>
        {isAddingKeepsake && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] shadow-2xl"
            >
              <h3 className="font-serif text-xl font-bold">Add Keepsake</h3>
              <form onSubmit={handleSaveKeepsake} className="mt-4 space-y-3">
                <select
                  value={newKsType}
                  onChange={e => setNewKsType(e.target.value as KeepsakeType)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs font-mono"
                >
                  <option value="conviction">Conviction</option>
                  <option value="rhema">Rhema</option>
                  <option value="inspiration">Inspiration</option>
                  <option value="exhortation">Exhortation</option>
                  <option value="quote">Quote</option>
                </select>
                <textarea
                  required
                  rows={4}
                  placeholder="Words that anchor and steady you..."
                  value={newKsText}
                  onChange={e => setNewKsText(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-sm"
                />
                <input
                  type="text"
                  placeholder="Author or Source (Optional)"
                  value={newKsSource}
                  onChange={e => setNewKsSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs"
                />
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAddingKeepsake(false)} className="px-4 py-2 text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold">
                    Save Keepsake
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
