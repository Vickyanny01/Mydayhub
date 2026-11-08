/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialIcon } from './components/MaterialIcon';

import {
  TabType,
  Task,
  Routine,
  StudyNote,
  Keepsake,
  DiaryEntry,
  QuickNote,
  ImportantDate,
  MindBoxItem,
} from './types';
import {
  initializeDataIfEmpty,
  getStoredPinData,
  getThemePreference,
  saveThemePreference,
  getTasks,
  saveTasks,
  getRoutines,
  saveRoutines,
  getStudyNotes,
  saveStudyNotes,
  getKeepsakes,
  saveKeepsakes,
  getDiaryEntries,
  saveDiaryEntries,
  getQuickNotes,
  saveQuickNotes,
  getImportantDates,
  saveImportantDates,
  getMindBoxItems,
  saveMindBoxItems,
  PinData,
} from './utils/storage';

import { Logo } from './components/Logo';
import { WelcomeScreen } from './components/WelcomeScreen';
import { PinScreen } from './components/PinScreen';
import { TodayView } from './components/TodayView';
import { LibraryView } from './components/LibraryView';
import { DiaryView } from './components/DiaryView';
import { AIHubView } from './components/AIHubView';
import { CalendarView } from './components/CalendarView';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isAutoStart = urlParams?.get('autostart') === '1';

  const [appStage, setAppStage] = useState<'welcome' | 'pin' | 'unlocked'>(
    isAutoStart ? 'unlocked' : 'welcome'
  );

  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [darkMode, setDarkMode] = useState<boolean>(() => getThemePreference());

  const [pinData, setPinData] = useState<PinData | null>(null);
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [studyNotes, setStudyNotes] = useState<StudyNote[]>([]);
  const [keepsakes, setKeepsakes] = useState<Keepsake[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [mindBoxItems, setMindBoxItems] = useState<MindBoxItem[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const reloadAllData = useCallback(() => {
    initializeDataIfEmpty();
    setPinData(getStoredPinData());
    setTasks(getTasks());
    setRoutines(getRoutines());
    setStudyNotes(getStudyNotes());
    setKeepsakes(getKeepsakes());
    setDiaryEntries(getDiaryEntries());
    setQuickNotes(getQuickNotes());
    setImportantDates(getImportantDates());
    setMindBoxItems(getMindBoxItems());
  }, []);

  useEffect(() => {
    reloadAllData();
  }, [reloadAllData]);

  // Sync theme with DOM
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      const themeMeta = document.getElementById('theme-color-meta');
      if (themeMeta) themeMeta.setAttribute('content', '#09090B');
    } else {
      document.documentElement.classList.remove('dark');
      const themeMeta = document.getElementById('theme-color-meta');
      if (themeMeta) themeMeta.setAttribute('content', '#FAF8F5');
    }
    saveThemePreference(darkMode);
  }, [darkMode]);

  // Lock when app is sent to background or window loses visibility
  useEffect(() => {
    if (isAutoStart) return;

    const handleVisibilityChange = () => {
      if (document.hidden && appStage === 'unlocked') {
        setAppStage('pin');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appStage, isAutoStart]);

  const handleUpdateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const nextState = !t.completed;
        return {
          ...t,
          completed: nextState,
          completedAt: nextState ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });
    handleUpdateTasks(updated);
  };

  const handleUpdateMindBoxItems = (newItems: MindBoxItem[]) => {
    setMindBoxItems(newItems);
    saveMindBoxItems(newItems);
  };

  const handleUpdateRoutines = (newRoutines: Routine[]) => {
    setRoutines(newRoutines);
    saveRoutines(newRoutines);
  };

  const handleUpdateStudyNotes = (newNotes: StudyNote[]) => {
    setStudyNotes(newNotes);
    saveStudyNotes(newNotes);
  };

  const handleUpdateKeepsakes = (newKeepsakes: Keepsake[]) => {
    setKeepsakes(newKeepsakes);
    saveKeepsakes(newKeepsakes);
  };

  const handleUpdateDiaryEntries = (newEntries: DiaryEntry[]) => {
    setDiaryEntries(newEntries);
    saveDiaryEntries(newEntries);
  };

  const handleUpdateImportantDates = (newDates: ImportantDate[]) => {
    setImportantDates(newDates);
    saveImportantDates(newDates);
  };

  const handleLockNow = () => {
    setAppStage('pin');
  };

  const handleToggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const NAV_ITEMS: { id: TabType; label: string; icon: string }[] = [
    { id: 'today', label: 'Today', icon: 'home' },
    { id: 'library', label: 'Library', icon: 'auto_stories' },
    { id: 'diary', label: 'Diary', icon: 'edit_note' },
    { id: 'ai-hub', label: 'AI Hub', icon: 'auto_awesome' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-[#FAF8F5] dark:bg-[#09090B] text-stone-900 dark:text-stone-100 selection:bg-amber-100 dark:selection:bg-amber-950/60 selection:text-amber-900 dark:selection:text-amber-200">
      {/* 1. WELCOME SCREEN */}
      <AnimatePresence>
        {appStage === 'welcome' && (
          <WelcomeScreen
            onComplete={() => {
              setAppStage('pin');
            }}
          />
        )}
      </AnimatePresence>

      {/* 2. PIN LOCK SCREEN / FIRST-TIME CREATION */}
      {appStage === 'pin' && (
        <PinScreen
          mode={pinData ? 'unlock' : 'create'}
          storedPinData={pinData}
          onSuccess={() => {
            setPinData(getStoredPinData());
            setAppStage('unlocked');
          }}
        />
      )}

      {/* CHANGE PIN MODAL */}
      {isChangingPin && (
        <PinScreen
          mode="change"
          storedPinData={pinData}
          onSuccess={() => {
            setPinData(getStoredPinData());
            setIsChangingPin(false);
          }}
          onCancelChange={() => setIsChangingPin(false)}
        />
      )}

      {/* 3. UNLOCKED APPLICATION SHELL */}
      {appStage === 'unlocked' && (
        <div className="flex-1 flex flex-col min-h-screen relative">
          {/* Top Application Bar - Material Design 3 Elevated Paper Header */}
          <header className="sticky top-0 z-30 px-4 sm:px-6 py-2.5 bg-[#FAF8F5]/95 dark:bg-[#09090B]/95 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Logo size={24} strokeColor="currentColor" accentColor="#D97706" />
              <div className="flex flex-col">
                <span className="font-serif text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100 leading-none">
                  MyDay Hub
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 dark:text-stone-400 mt-0.5 font-medium">
                  Personal Journal & Planner
                </span>
              </div>
            </div>

            {/* Top-Right Controls with Pill-Shaped Sun/Moon Toggle & Profile Avatar matching Phone 4 */}
            <div className="flex items-center gap-2">
              {/* Dual-State Sun/Moon Pill Theme Toggle */}
              <button
                onClick={handleToggleDarkMode}
                className="flex items-center gap-1 p-1 rounded-full bg-white dark:bg-stone-800/90 border border-stone-200/90 dark:border-stone-700/80 shadow-2xs hover:border-amber-400 dark:hover:border-amber-500 transition cursor-pointer active:scale-95"
                title={darkMode ? 'Switch to Warm Paper Light Mode' : 'Switch to Ink Dark Mode'}
                aria-label="Toggle theme"
              >
                <div
                  className={`p-1 rounded-full flex items-center justify-center transition-all ${
                    !darkMode
                      ? 'bg-amber-100 text-[#D97706] shadow-2xs'
                      : 'text-stone-400 opacity-50'
                  }`}
                >
                  <MaterialIcon name="light_mode" size={17} filled={!darkMode} weight={600} />
                </div>
                <div
                  className={`p-1 rounded-full flex items-center justify-center transition-all ${
                    darkMode
                      ? 'bg-blue-950/80 text-blue-400 shadow-2xs'
                      : 'text-stone-400 opacity-50'
                  }`}
                >
                  <MaterialIcon name="dark_mode" size={17} filled={darkMode} weight={600} />
                </div>
              </button>

              {/* Polished User Profile Avatar matching Phone 4 */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-8 h-8 rounded-full overflow-hidden border border-amber-300 dark:border-amber-600 shadow-2xs hover:scale-105 active:scale-95 transition-transform cursor-pointer flex-shrink-0"
                title="Account Profile & Settings"
                aria-label="Account Profile & Settings"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"
                  alt="User Profile"
                  className="w-full h-full object-cover"
                />
              </button>

              <button
                onClick={handleLockNow}
                className="p-1.5 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition cursor-pointer active:scale-90"
                title="Lock Journal"
                aria-label="Lock Journal"
              >
                <MaterialIcon name="lock" size={20} />
              </button>
            </div>
          </header>

          {/* Main Tab View Content with page transitions */}
          <main className="flex-1 w-full overflow-x-hidden">
            <AnimatePresence mode="wait">
              {currentTab === 'today' && (
                <motion.div
                  key="today"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <TodayView
                    tasks={tasks}
                    routines={routines}
                    diaryEntries={diaryEntries}
                    mindBoxItems={mindBoxItems}
                    onUpdateTasks={handleUpdateTasks}
                    onUpdateMindBoxItems={handleUpdateMindBoxItems}
                    onOpenLibraryRoutines={() => setCurrentTab('library')}
                  />
                </motion.div>
              )}

              {currentTab === 'library' && (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <LibraryView
                    routines={routines}
                    studyNotes={studyNotes}
                    keepsakes={keepsakes}
                    onUpdateRoutines={handleUpdateRoutines}
                    onUpdateStudyNotes={handleUpdateStudyNotes}
                    onUpdateKeepsakes={handleUpdateKeepsakes}
                  />
                </motion.div>
              )}

              {currentTab === 'diary' && (
                <motion.div
                  key="diary"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <DiaryView
                    entries={diaryEntries}
                    onUpdateEntries={handleUpdateDiaryEntries}
                    appPinData={pinData}
                  />
                </motion.div>
              )}

              {currentTab === 'ai-hub' && (
                <motion.div
                  key="ai-hub"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <AIHubView
                    diaryEntries={diaryEntries}
                    tasks={tasks}
                  />
                </motion.div>
              )}

              {currentTab === 'calendar' && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <CalendarView
                    importantDates={importantDates}
                    tasks={tasks}
                    diaryEntries={diaryEntries}
                    onUpdateImportantDates={handleUpdateImportantDates}
                    onSelectDateForToday={() => {
                      setCurrentTab('today');
                    }}
                    onToggleTask={handleToggleTask}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Android MD3 Bottom Navigation Bar with Authentic Material Symbols Rounded */}
          <nav
            aria-label="Bottom Navigation"
            className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/98 dark:bg-[#09090B]/98 backdrop-blur-md border-t border-stone-200/70 dark:border-stone-800/80 select-none pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-none"
          >
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
              {NAV_ITEMS.map(item => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className="flex-1 h-full flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 transition-transform group"
                    aria-label={`Switch to ${item.label}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div
                      className={`w-14 h-8 rounded-full transition-all duration-200 flex items-center justify-center ${
                        isActive
                          ? 'bg-[#FDE7C7] dark:bg-amber-500/20'
                          : 'bg-transparent'
                      }`}
                    >
                      <MaterialIcon
                        name={item.icon}
                        size={24}
                        filled={isActive}
                        weight={isActive ? 600 : 400}
                        className={
                          isActive
                            ? 'text-[#EA580C] dark:text-amber-400'
                            : 'text-[#374151] dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-100'
                        }
                      />
                    </div>
                    <span
                      className={`text-[11px] font-sans mt-1 tracking-tight transition-colors ${
                        isActive
                          ? 'font-bold text-[#EA580C] dark:text-amber-400'
                          : 'font-medium text-[#4B5563] dark:text-stone-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Settings & Backup Modal */}
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onRequestChangePin={() => setIsChangingPin(true)}
            onLockNow={handleLockNow}
            stats={{
              tasksCount: tasks.length,
              routinesCount: routines.length,
              keepsakesCount: keepsakes.length,
              diaryCount: diaryEntries.length,
              notesCount: quickNotes.length,
            }}
            onDataRestored={reloadAllData}
          />
        </div>
      )}
    </div>
  );
}
