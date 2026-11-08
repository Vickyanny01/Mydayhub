import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialIcon } from './MaterialIcon';
import { Task, Routine, DiaryEntry, MindBoxItem } from '../types';
import {
  formatHeroDate,
  getTodayString,
  parseDateString,
  formatDateToString,
  compareTimes,
  getTimeOfDayInfo,
} from '../utils/date';
import { addRoutinesToDay } from '../utils/storage';
import { fetchDailyRecap, parseNaturalLanguageSchedule, DailyRecapResult } from '../utils/ai';

interface TodayViewProps {
  tasks: Task[];
  routines: Routine[];
  diaryEntries?: DiaryEntry[];
  mindBoxItems: MindBoxItem[];
  onUpdateTasks: (newTasks: Task[]) => void;
  onUpdateMindBoxItems: (items: MindBoxItem[]) => void;
  onOpenLibraryRoutines: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  routines,
  diaryEntries = [],
  mindBoxItems,
  onUpdateTasks,
  onUpdateMindBoxItems,
  onOpenLibraryRoutines,
}) => {
  const todayStr = getTodayString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Standard modal state
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newTime, setNewTime] = useState<string>('09:00');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newNotes, setNewNotes] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('deep-work');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Mind Box inbox state
  const [mindBoxSearch, setMindBoxSearch] = useState<string>('');
  const [newMindBoxText, setNewMindBoxText] = useState<string>('');
  const [schedulingMindBoxId, setSchedulingMindBoxId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState<string>('14:00');

  // AI Smart Scheduler input
  const [smartPrompt, setSmartPrompt] = useState<string>('');
  const [isParsingSmartPrompt, setIsParsingSmartPrompt] = useState<boolean>(false);

  // AI Daily Recap / Evening Reflection modal
  const [isRecapOpen, setIsRecapOpen] = useState<boolean>(false);
  const [recapData, setRecapData] = useState<DailyRecapResult | null>(null);
  const [isLoadingRecap, setIsLoadingRecap] = useState<boolean>(false);

  const isToday = selectedDate === todayStr;

  // Time of day info
  const timeOfDay = useMemo(() => {
    return getTimeOfDayInfo(new Date().getHours());
  }, []);

  // Current time string 'HH:MM'
  const currentTimeStr = useMemo(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }, []);

  // Weekly calendar strip generator (current week Mon-Sun around selectedDate)
  const weekDays = useMemo(() => {
    const curr = parseDateString(selectedDate);
    // Find Monday of the current week (assuming Monday is start of week)
    const day = curr.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMon);

    const days = [];
    const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatDateToString(d);
      days.push({
        dateStr,
        dayName: DAY_NAMES[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }
    return days;
  }, [selectedDate, todayStr]);

  // Filter tasks for selected date and sort chronologically
  const dayTasks = useMemo(() => {
    return tasks
      .filter(t => t.date === selectedDate)
      .sort((a, b) => compareTimes(a.time, b.time));
  }, [tasks, selectedDate]);

  // Find the "NOW" task
  const nowTaskId = useMemo(() => {
    if (!isToday) return null;
    const pending = dayTasks.filter(t => !t.completed);
    if (pending.length === 0) return null;
    const upcoming = pending.find(t => compareTimes(t.time, currentTimeStr) >= 0);
    return upcoming ? upcoming.id : pending[0].id;
  }, [dayTasks, isToday, currentTimeStr]);

  const totalTasks = dayTasks.length;
  const completedTasks = dayTasks.filter(t => t.completed).length;
  const progressRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const progressPercent = Math.round(progressRatio * 100);

  // Toggle task completion
  const handleToggleTask = (taskId: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
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
    onUpdateTasks(updated);
  };

  // Delete task
  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tasks.filter(t => t.id !== taskId);
    onUpdateTasks(updated);
  };

  // Add routines to day
  const handleAddRoutines = () => {
    if (routines.length === 0) {
      setBannerNotice('No daily routines found in Library. Configure routines first.');
      setTimeout(() => setBannerNotice(null), 3500);
      return;
    }
    const { updatedTasks, addedCount } = addRoutinesToDay(selectedDate, tasks, routines);
    onUpdateTasks(updatedTasks);
    if (addedCount > 0) {
      setBannerNotice(`Imported ${addedCount} routine${addedCount === 1 ? '' : 's'} into today's ledger.`);
    } else {
      setBannerNotice('All routines already exist for this day.');
    }
    setTimeout(() => setBannerNotice(null), 3000);
  };

  // Create manual task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: selectedDate,
      title: newTitle.trim(),
      time: newTime || '09:00',
      durationMinutes: newDuration || 30,
      category: newCategory,
      completed: false,
      notes: newNotes.trim() || undefined,
    };

    onUpdateTasks([...tasks, newTask]);
    setNewTitle('');
    setNewNotes('');
    setNewDuration(30);
    setIsAddingTask(false);
  };

  // Handle AI Smart Scheduler submit
  const handleSmartScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartPrompt.trim() || isParsingSmartPrompt) return;

    setIsParsingSmartPrompt(true);
    try {
      const result = await parseNaturalLanguageSchedule(smartPrompt, selectedDate);
      if (result.items && result.items.length > 0) {
        const createdTasks: Task[] = result.items.map(item => ({
          id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          date: item.date || selectedDate,
          title: item.title,
          time: item.time || '09:00',
          durationMinutes: item.durationMinutes || 30,
          category: item.category || 'deep-work',
          completed: false,
          notes: item.notes,
        }));

        onUpdateTasks([...tasks, ...createdTasks]);
        setSmartPrompt('');
        setBannerNotice(`Scheduled ${createdTasks.length} task${createdTasks.length === 1 ? '' : 's'} with AI.`);
        setTimeout(() => setBannerNotice(null), 3500);
      }
    } catch (err) {
      console.error(err);
      setBannerNotice('Could not parse schedule. Try entering time directly.');
      setTimeout(() => setBannerNotice(null), 3500);
    } finally {
      setIsParsingSmartPrompt(false);
    }
  };

  // Trigger AI Daily Recap / Evening Reflection
  const handleOpenRecap = async () => {
    setIsRecapOpen(true);
    setIsLoadingRecap(true);
    try {
      const result = await fetchDailyRecap({
        date: selectedDate,
        tasks: dayTasks,
        diaryEntries: diaryEntries.filter(d => d.date === selectedDate),
        routines,
      });
      setRecapData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRecap(false);
    }
  };

  // Mind Box actions
  const handleAddMindBoxItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMindBoxText.trim()) return;

    const newItem: MindBoxItem = {
      id: 'mb-' + Date.now(),
      text: newMindBoxText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    onUpdateMindBoxItems([newItem, ...mindBoxItems]);
    setNewMindBoxText('');
  };

  const handleToggleMindBoxItem = (id: string) => {
    const updated = mindBoxItems.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onUpdateMindBoxItems(updated);
  };

  const handleDeleteMindBoxItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateMindBoxItems(mindBoxItems.filter(i => i.id !== id));
  };

  // Schedule Mind Box item into Today's timeline
  const handleScheduleMindBoxItem = (item: MindBoxItem) => {
    const newTask: Task = {
      id: 'task-' + Date.now(),
      date: selectedDate,
      title: item.text,
      time: scheduleTime,
      durationMinutes: 30,
      completed: false,
      category: item.category || 'personal',
    };

    onUpdateTasks([...tasks, newTask]);
    // remove from mind box or mark completed
    onUpdateMindBoxItems(mindBoxItems.filter(i => i.id !== item.id));
    setSchedulingMindBoxId(null);
    setBannerNotice(`Moved "${item.text}" to Today's schedule.`);
    setTimeout(() => setBannerNotice(null), 3000);
  };

  const filteredMindBoxItems = mindBoxItems.filter(i =>
    i.text.toLowerCase().includes(mindBoxSearch.toLowerCase())
  );

  const { weekday, dayAndMonth, year } = formatHeroDate(selectedDate);

  // Category Pastel Accent Mapping (Soft Muted Pastels: Sky Blue, Lavender, Peach, Sage Green)
  const getCategoryStyles = (category?: string) => {
    switch (category) {
      case 'deep-work':
        return {
          barColor: 'bg-purple-500',
          cardBg: 'bg-[#F3E8FF]/45 dark:bg-[#1A1625] border-purple-200/70 dark:border-purple-900/40',
          badgeBg: 'bg-purple-100/80 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300',
        };
      case 'routine':
        return {
          barColor: 'bg-emerald-500',
          cardBg: 'bg-[#DCFCE7]/45 dark:bg-[#12231A] border-emerald-200/70 dark:border-emerald-900/40',
          badgeBg: 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
        };
      case 'health':
        return {
          barColor: 'bg-teal-500',
          cardBg: 'bg-[#CCFBF1]/45 dark:bg-[#102422] border-teal-200/70 dark:border-teal-900/40',
          badgeBg: 'bg-teal-100/80 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300',
        };
      case 'meeting':
        return {
          barColor: 'bg-sky-500',
          cardBg: 'bg-[#E0F2FE]/45 dark:bg-[#102230] border-sky-200/70 dark:border-sky-900/40',
          badgeBg: 'bg-sky-100/80 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300',
        };
      case 'personal':
      default:
        return {
          barColor: 'bg-amber-500',
          cardBg: 'bg-[#FFEDD5]/45 dark:bg-[#261A12] border-amber-200/70 dark:border-amber-900/40',
          badgeBg: 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
        };
    }
  };

  return (
    <div className="min-h-full pb-36 pt-2 max-w-xl mx-auto px-4 sm:px-6 relative font-sans space-y-4">
      {/* 1. HORIZONTAL WEEKLY SCROLL HEADER */}
      <section className="bg-[var(--color-surface)] rounded-3xl p-4 md3-elevation-1 border border-[var(--color-hairline)] select-none">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-muted)] font-medium">
              {timeOfDay.greeting}
            </span>
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] leading-none mt-0.5">
              {dayAndMonth} <span className="text-sm font-normal text-[var(--color-muted)] font-mono">{year}</span>
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-saffron)] text-white hover:opacity-90 transition active:scale-95 cursor-pointer"
              >
                Today
              </button>
            )}
            <button
              onClick={handleOpenRecap}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-amber-300 dark:border-amber-700 text-[#D97706] dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-[#D97706] hover:text-white transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <MaterialIcon name="auto_awesome" size={16} filled />
              <span>Evening Recap</span>
            </button>
          </div>
        </div>

        {/* 7-Day Horizontal Pill Strip */}
        <div className="flex items-center justify-between gap-1 pt-3 overflow-x-auto">
          {weekDays.map(item => (
            <button
              key={item.dateStr}
              onClick={() => setSelectedDate(item.dateStr)}
              className={`flex-1 min-w-[42px] py-2.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                item.isSelected
                  ? 'bg-[var(--color-ink)] text-[var(--color-paper)] md3-elevation-2 font-semibold'
                  : item.isToday
                  ? 'bg-amber-100/70 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                  : 'hover:bg-[var(--color-paper)] text-[var(--color-muted)]'
              }`}
            >
              <span className="text-[11px] font-medium tracking-tight uppercase">
                {item.dayName}
              </span>
              <span className={`font-mono text-sm mt-0.5 tabular-nums ${item.isSelected ? 'font-bold' : ''}`}>
                {item.dayNum}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. PROGRESS BANNER WITH PAIRED PILL PROGRESS */}
      <section className="bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-indigo-500/10 rounded-3xl p-4 border border-[var(--color-hairline)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--color-saffron)] flex items-center justify-center bg-[var(--color-surface)]">
            <span className="font-mono text-xs font-bold text-[var(--color-ink)]">
              {progressPercent}%
            </span>
          </div>
          <div>
            <h4 className="font-serif text-base font-semibold text-[var(--color-ink)]">
              {completedTasks === totalTasks && totalTasks > 0
                ? 'All Schedule Blocks Done! 🎉'
                : `${completedTasks} of ${totalTasks} blocks completed`}
            </h4>
            <p className="text-xs text-[var(--color-muted)]">
              {totalTasks === 0 ? 'No blocks scheduled for this day.' : 'Steady daily rhythm.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {routines.length > 0 && (
            <button
              onClick={handleAddRoutines}
              className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] text-xs text-[var(--color-ink)] hover:text-[var(--color-saffron)] transition shadow-xs cursor-pointer active:scale-90 flex items-center justify-center"
              title="Import Daily Routines"
            >
              <MaterialIcon name="sync" size={18} />
            </button>
          )}
          <button
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-saffron)] text-white text-xs font-semibold shadow-xs hover:opacity-90 transition active:scale-95 cursor-pointer"
          >
            <MaterialIcon name="add" size={18} />
            <span>Block Time</span>
          </button>
        </div>
      </section>

      {/* 3. AI SMART SCHEDULER INPUT BAR */}
      <section className="bg-[var(--color-surface)] rounded-2xl p-2.5 border border-[var(--color-hairline)] md3-elevation-1">
        <form onSubmit={handleSmartScheduleSubmit} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 flex-shrink-0">
            <MaterialIcon name="auto_awesome" size={18} filled />
          </div>
          <input
            type="text"
            value={smartPrompt}
            onChange={e => setSmartPrompt(e.target.value)}
            placeholder="AI Scheduler: 'Deep work 9 to 11am then gym at 5pm'..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none"
            disabled={isParsingSmartPrompt}
          />
          <button
            type="submit"
            disabled={!smartPrompt.trim() || isParsingSmartPrompt}
            className="p-2 rounded-xl bg-[var(--color-ink)] text-[var(--color-paper)] disabled:opacity-40 hover:opacity-90 transition cursor-pointer flex-shrink-0 flex items-center justify-center"
          >
            {isParsingSmartPrompt ? (
              <MaterialIcon name="progress_activity" size={18} className="animate-spin" />
            ) : (
              <MaterialIcon name="send" size={18} />
            )}
          </button>
        </form>
      </section>

      {/* Toast Notice */}
      <AnimatePresence>
        {bannerNotice && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="px-4 py-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] flex items-center justify-between shadow-sm"
          >
            <span>{bannerNotice}</span>
            <button onClick={() => setBannerNotice(null)} className="p-1 text-[var(--color-muted)] flex items-center justify-center">
              <MaterialIcon name="close" size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Anchor Routine Cards matching Phone 1 */}
      <div className="space-y-2">
        <div
          onClick={onOpenLibraryRoutines}
          className="p-3.5 rounded-2xl bg-purple-100/80 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between text-purple-900 dark:text-purple-200 shadow-2xs hover:bg-purple-100 transition cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-200/80 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <MaterialIcon name="bedtime" size={18} filled />
            </div>
            <span className="text-xs font-semibold">Evening Reflection</span>
          </div>
          <MaterialIcon name="chevron_right" size={20} className="text-purple-600 dark:text-purple-400" />
        </div>

        <div
          onClick={() => {
            setNewTitle('Deep work 9 to 11am');
            setNewTime('09:00');
            setNewDuration(120);
            setNewCategory('deep-work');
            setIsAddingTask(true);
          }}
          className="p-3.5 rounded-2xl bg-sky-100/80 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/40 flex items-center justify-between text-sky-900 dark:text-sky-200 shadow-2xs hover:bg-sky-100 transition cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-200/80 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center">
              <MaterialIcon name="auto_awesome" size={18} filled />
            </div>
            <span className="text-xs font-semibold">Deep work 9 to 11am</span>
          </div>
          <MaterialIcon name="chevron_right" size={20} className="text-sky-600 dark:text-sky-400" />
        </div>
      </div>

      {/* 4. SCHEDULE BLOCKS (COLOR-CODED TIMELINE CARDS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-serif text-lg font-semibold text-[var(--color-ink)]">
            Schedule Blocks
          </h3>
          <span className="font-mono text-xs text-[var(--color-muted)]">
            {dayTasks.length} items
          </span>
        </div>

        {dayTasks.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--color-hairline)] bg-[var(--color-surface)] p-6">
            <MaterialIcon name="schedule" size={36} className="text-[var(--color-muted)] mb-2" />
            <p className="font-serif text-lg font-medium text-[var(--color-ink)]">
              No blocks scheduled.
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Add a time block above or drag an unscheduled idea from the Mind Box below.
            </p>
            <button
              onClick={() => setIsAddingTask(true)}
              className="mt-3 px-4 py-2 rounded-full bg-[var(--color-saffron)] text-white text-xs font-medium hover:opacity-90 transition cursor-pointer flex items-center gap-1 mx-auto"
            >
              <MaterialIcon name="add" size={16} />
              <span>Create Block</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {dayTasks.map(task => {
              const isDone = task.completed;
              const isNow = task.id === nowTaskId;
              const duration = task.durationMinutes || 30;
              const { barColor, cardBg, badgeBg } = getCategoryStyles(task.category);

              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`relative rounded-3xl border p-4 flex items-start gap-3.5 transition-all cursor-pointer select-none md3-elevation-1 hover:md3-elevation-2 active:scale-[0.99] overflow-hidden ${cardBg} ${
                    isDone ? 'opacity-60 grayscale-[25%]' : ''
                  }`}
                >
                  {/* Vertical Accent Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-2.5 ${barColor} rounded-r-xs`} />

                  {/* Large Pill-Shaped Checkbox */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleToggleTask(task.id);
                    }}
                    className={`mt-0.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 shadow-2xs active:scale-95 ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isNow
                        ? 'border-2 border-amber-500 text-amber-900 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/80 font-bold'
                        : 'border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-900/80 text-stone-700 dark:text-stone-300 hover:border-stone-500'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <MaterialIcon name="check" size={16} weight={700} />
                        <span>Done</span>
                      </>
                    ) : (
                      <span>Pending</span>
                    )}
                  </button>

                  {/* Time & Duration Tag */}
                  <div className="w-16 flex-shrink-0 pt-0.5">
                    <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      {task.time}
                    </span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                      {duration}m
                    </span>
                  </div>

                  {/* Task Details */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-medium leading-snug transition-colors ${
                          isDone
                            ? 'text-[var(--color-muted)] line-through'
                            : 'text-[var(--color-ink)]'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.category && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${badgeBg}`}>
                          {task.category}
                        </span>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-xs text-[var(--color-muted)] mt-1 font-sans line-clamp-2">
                        {task.notes}
                      </p>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={e => handleDeleteTask(task.id, e)}
                    className="p-1 text-[var(--color-muted)] hover:text-red-500 transition cursor-pointer flex items-center justify-center"
                    aria-label="Delete block"
                  >
                    <MaterialIcon name="delete" size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. MIND BOX (DEDICATED SEARCHABLE INBOX SECTION AT BOTTOM) */}
      <section className="bg-[var(--color-surface)] rounded-3xl p-4 md3-elevation-1 border border-[var(--color-hairline)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <MaterialIcon name="inbox" size={18} filled />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-[var(--color-ink)] leading-none">
                Mind Box
              </h3>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5 font-mono">
                Capture unscheduled to-dos & fleeting tasks
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--color-paper)] text-[var(--color-muted)]">
            {mindBoxItems.filter(i => !i.completed).length} open
          </span>
        </div>

        {/* Search input in Mind Box */}
        <div className="relative">
          <MaterialIcon name="search" size={18} className="absolute left-3 top-2.5 text-[var(--color-muted)]" />
          <input
            type="text"
            value={mindBoxSearch}
            onChange={e => setMindBoxSearch(e.target.value)}
            placeholder="Search Mind Box items..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-saffron)]"
          />
        </div>

        {/* Quick Add input for Mind Box */}
        <form onSubmit={handleAddMindBoxItem} className="flex gap-2">
          <input
            type="text"
            value={newMindBoxText}
            onChange={e => setNewMindBoxText(e.target.value)}
            placeholder="Quick capture unassigned to-do..."
            className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-saffron)]"
          />
          <button
            type="submit"
            disabled={!newMindBoxText.trim()}
            className="px-4 py-2 rounded-xl bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-medium disabled:opacity-40 hover:opacity-90 transition cursor-pointer"
          >
            Capture
          </button>
        </form>

        {/* List of Mind Box Items */}
        <div className="space-y-1.5 pt-1 max-h-60 overflow-y-auto">
          {filteredMindBoxItems.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)] py-3 text-center italic font-serif">
              Mind Box is empty. No lingering thoughts.
            </p>
          ) : (
            filteredMindBoxItems.map(item => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)]/70 flex items-center justify-between gap-2 hover:bg-[var(--color-paper)] transition"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleMindBoxItem(item.id)}
                    className="flex-shrink-0 cursor-pointer flex items-center justify-center"
                    aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    <MaterialIcon
                      name={item.completed ? 'check_circle' : 'radio_button_unchecked'}
                      size={20}
                      filled={item.completed}
                      className={item.completed ? 'text-emerald-600' : 'text-stone-400'}
                    />
                  </button>
                  <span
                    className={`text-xs truncate ${
                      item.completed ? 'line-through text-[var(--color-muted)]' : 'text-[var(--color-ink)]'
                    }`}
                  >
                    {item.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* One-tap Schedule to Today button */}
                  {schedulingMindBoxId === item.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="px-1 py-0.5 text-xs font-mono rounded border border-[var(--color-hairline)] bg-[var(--color-surface)]"
                      />
                      <button
                        onClick={() => handleScheduleMindBoxItem(item)}
                        className="p-1 rounded bg-[var(--color-saffron)] text-white text-[10px] font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setSchedulingMindBoxId(null)}
                        className="p-1 text-[var(--color-muted)] text-[10px]"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSchedulingMindBoxId(item.id)}
                      className="px-2.5 py-1 rounded-lg border border-[var(--color-hairline)] text-[10px] font-mono text-[var(--color-muted)] hover:text-[var(--color-ink)] flex items-center gap-1 bg-[var(--color-surface)] transition active:scale-95 cursor-pointer"
                      title="Schedule onto Today's ledger"
                    >
                      <span>Schedule</span>
                      <MaterialIcon name="arrow_forward" size={14} />
                    </button>
                  )}

                  <button
                    onClick={e => handleDeleteMindBoxItem(item.id, e)}
                    className="p-1 text-[var(--color-muted)] hover:text-red-500 flex items-center justify-center cursor-pointer"
                    aria-label="Delete mind box item"
                  >
                    <MaterialIcon name="delete" size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Filter & Actions Bar matching Phone 1 */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-hairline)] text-stone-500 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px]">
              <MaterialIcon name="check" size={14} weight={600} />
              <span>Checklist</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-[11px]">
              <MaterialIcon name="sell" size={14} />
              <span>Tags</span>
            </div>
          </div>
          <MaterialIcon name="more_vert" size={18} className="text-stone-400" />
        </div>
      </section>

      {/* MODAL: MANUAL TASK CREATION */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
                <h3 className="font-serif text-xl font-bold">New Schedule Block</h3>
                <button onClick={() => setIsAddingTask(false)} className="p-1 text-[var(--color-muted)] flex items-center justify-center">
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    Block Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deep Work: System Architecture"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-sm focus:outline-none focus:border-[var(--color-saffron)] text-[var(--color-ink)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] font-mono text-sm focus:outline-none focus:border-[var(--color-saffron)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={newDuration}
                      onChange={e => setNewDuration(parseInt(e.target.value, 10) || 30)}
                      className="w-full px-3 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] font-mono text-sm focus:outline-none focus:border-[var(--color-saffron)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    Category Tag
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {['deep-work', 'routine', 'health', 'meeting', 'personal'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider transition ${
                          newCategory === cat
                            ? 'bg-[var(--color-ink)] text-[var(--color-paper)] font-bold'
                            : 'bg-[var(--color-paper)] border border-[var(--color-hairline)] text-[var(--color-muted)]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Details or preparation required"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-sm focus:outline-none focus:border-[var(--color-saffron)] text-[var(--color-ink)]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[var(--color-muted)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[var(--color-saffron)] text-white text-xs font-mono uppercase tracking-wider font-semibold hover:opacity-90"
                  >
                    Save Block
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EVENING REFLECTION & INSIGHTS */}
      <AnimatePresence>
        {isRecapOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="auto_awesome" size={20} filled className="text-[var(--color-saffron)]" />
                  <h3 className="font-serif text-xl font-bold">Evening Reflection & Insights</h3>
                </div>
                <button onClick={() => setIsRecapOpen(false)} className="p-1 text-[var(--color-muted)] flex items-center justify-center">
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>

              {isLoadingRecap ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <MaterialIcon name="progress_activity" size={32} className="text-[var(--color-saffron)] animate-spin" />
                  <p className="font-serif text-sm text-[var(--color-muted)] italic">
                    Analyzing daily cadence, tasks, and reflections...
                  </p>
                </div>
              ) : recapData ? (
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--color-paper)] border border-[var(--color-hairline)]">
                    <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)] font-semibold block mb-1">
                      Daily Cadence
                    </span>
                    <p className="font-serif text-base sm:text-lg leading-relaxed text-[var(--color-ink)]">
                      "{recapData.summary}"
                    </p>
                  </div>

                  {recapData.patterns && (
                    <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/40 border border-teal-200/50 dark:border-teal-900/50">
                      <span className="font-mono text-xs uppercase tracking-widest text-teal-700 dark:text-teal-300 font-semibold block mb-2">
                        Recognized Patterns
                      </span>
                      <ul className="space-y-1 text-xs sm:text-sm text-[var(--color-ink)]">
                        {recapData.patterns.map((p, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-teal-600 font-bold">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {recapData.tomorrowIntention && (
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/50">
                      <span className="font-mono text-xs uppercase tracking-widest text-amber-700 dark:text-amber-300 font-semibold block mb-1">
                        Tomorrow's Focal Intention
                      </span>
                      <p className="text-xs sm:text-sm text-[var(--color-ink)]">
                        {recapData.tomorrowIntention}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setIsRecapOpen(false)}
                      className="px-5 py-2 rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono uppercase tracking-wider font-semibold"
                    >
                      Close Reflection
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
