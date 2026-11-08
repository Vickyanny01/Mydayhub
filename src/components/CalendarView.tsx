import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaterialIcon } from './MaterialIcon';
import { ImportantDate, Task, DiaryEntry } from '../types';
import {
  getTodayString,
  getMonthMatrix,
  formatShortDate,
  getRelativeDateLabel,
  getDaysDifference,
  parseDateString,
  formatHeroDate,
} from '../utils/date';
import { parseNaturalLanguageSchedule } from '../utils/ai';

interface CalendarViewProps {
  importantDates: ImportantDate[];
  tasks: Task[];
  diaryEntries: DiaryEntry[];
  onUpdateImportantDates: (dates: ImportantDate[]) => void;
  onSelectDateForToday: (dateStr: string) => void;
  onToggleTask?: (taskId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  importantDates,
  tasks,
  diaryEntries,
  onUpdateImportantDates,
  onSelectDateForToday,
  onToggleTask,
}) => {
  const todayStr = getTodayString();
  const todayDate = parseDateString(todayStr);

  const [currentYear, setCurrentYear] = useState<number>(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayDate.getMonth()); // 0-11
  const [selectedDayStr, setSelectedDayStr] = useState<string>(todayStr);

  const [isAddingDate, setIsAddingDate] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(todayStr);
  const [newYearlyRepeat, setNewYearlyRepeat] = useState<boolean>(false);

  // Natural language smart input bar
  const [smartInputText, setSmartInputText] = useState<string>('');
  const [isParsingSmart, setIsParsingSmart] = useState<boolean>(false);
  const [smartNotice, setSmartNotice] = useState<string | null>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const monthMatrix = getMonthMatrix(currentYear, currentMonth, todayStr);
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long' });

  // Add important date manually
  const handleSaveImportantDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    const item: ImportantDate = {
      id: 'id-' + Date.now(),
      title: newTitle.trim(),
      date: newDate,
      yearlyRepeat: newYearlyRepeat,
    };

    onUpdateImportantDates([...importantDates, item]);
    setNewTitle('');
    setNewYearlyRepeat(false);
    setIsAddingDate(false);
  };

  // Smart Input parser (e.g. "Launch on Nov 15")
  const handleSmartScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartInputText.trim() || isParsingSmart) return;

    setIsParsingSmart(true);
    try {
      const lower = smartInputText.toLowerCase();
      const isYearly = lower.includes('yearly') || lower.includes('annual') || lower.includes('birthday') || lower.includes('anniversary');

      const parsed = await parseNaturalLanguageSchedule(smartInputText, selectedDayStr);
      if (parsed.items && parsed.items.length > 0) {
        const first = parsed.items[0];
        const newMilestone: ImportantDate = {
          id: 'id-' + Date.now(),
          title: first.title,
          date: first.date || selectedDayStr,
          yearlyRepeat: isYearly,
        };

        onUpdateImportantDates([...importantDates, newMilestone]);
        setSmartInputText('');
        setSmartNotice(`Milestone added: "${newMilestone.title}" on ${newMilestone.date}`);
        setTimeout(() => setSmartNotice(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setSmartNotice('Could not parse milestone. Add directly with the button.');
      setTimeout(() => setSmartNotice(null), 3000);
    } finally {
      setIsParsingSmart(false);
    }
  };

  const handleDeleteImportantDate = (id: string) => {
    onUpdateImportantDates(importantDates.filter(d => d.id !== id));
  };

  // Upcoming Milestones & Deadlines list calculation
  const upcomingList = importantDates
    .map(item => {
      let targetDateStr = item.date;
      if (item.yearlyRepeat) {
        const [, m, d] = item.date.split('-');
        const thisYearTarget = `${todayDate.getFullYear()}-${m}-${d}`;
        const diff = getDaysDifference(todayStr, thisYearTarget);
        if (diff < 0) {
          targetDateStr = `${todayDate.getFullYear() + 1}-${m}-${d}`;
        } else {
          targetDateStr = thisYearTarget;
        }
      }
      const daysUntil = getDaysDifference(todayStr, targetDateStr);
      return {
        ...item,
        effectiveDate: targetDateStr,
        daysUntil,
      };
    })
    .filter(item => item.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Selected date agenda
  const selectedDayTasks = tasks.filter(t => t.date === selectedDayStr);
  const selectedDayDiary = diaryEntries.find(d => d.date === selectedDayStr);
  const selectedImportant = importantDates.filter(d => {
    if (d.date === selectedDayStr) return true;
    if (d.yearlyRepeat) {
      const [, m, day] = d.date.split('-');
      const [, sm, sday] = selectedDayStr.split('-');
      return m === sm && day === sday;
    }
    return false;
  });

  const { weekday, dayAndMonth, year } = formatHeroDate(selectedDayStr);

  return (
    <div className="min-h-full pb-36 pt-2 max-w-xl mx-auto px-4 sm:px-6 relative font-sans space-y-4">
      {/* 1. HEADER & NATURAL LANGUAGE SMART INPUT BAR */}
      <section className="bg-[var(--color-surface)] rounded-3xl p-4 md3-elevation-1 border border-[var(--color-hairline)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-muted)] font-medium">
              Calendar & Milestones
            </span>
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] leading-none mt-0.5">
              {monthName} <span className="text-sm font-normal text-[var(--color-muted)] font-mono">{currentYear}</span>
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-full border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition flex items-center justify-center cursor-pointer"
              aria-label="Previous month"
            >
              <MaterialIcon name="chevron_left" size={20} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-full border border-[var(--color-hairline)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition flex items-center justify-center cursor-pointer"
              aria-label="Next month"
            >
              <MaterialIcon name="chevron_right" size={20} />
            </button>
            <button
              onClick={() => {
                setNewTitle('');
                setNewDate(selectedDayStr);
                setNewYearlyRepeat(false);
                setIsAddingDate(true);
              }}
              className="px-3.5 py-1.5 rounded-full bg-[var(--color-saffron)] text-white text-xs font-semibold hover:opacity-90 transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <MaterialIcon name="add" size={16} />
              <span>Add Date</span>
            </button>
          </div>
        </div>

        {/* Natural Language Scheduling Input Bar with Search & AI Sparkle Icon */}
        <form
          onSubmit={handleSmartScheduleSubmit}
          className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl bg-[var(--color-paper)] border border-[var(--color-hairline)] focus-within:border-[var(--color-saffron)] transition"
        >
          <MaterialIcon name="search" size={18} className="text-[var(--color-muted)] flex-shrink-0" />
          <input
            type="text"
            value={smartInputText}
            onChange={e => setSmartInputText(e.target.value)}
            placeholder="Search events, tasks, or type 'Launch on Nov 15'..."
            className="flex-1 bg-transparent text-xs text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none"
            disabled={isParsingSmart}
          />
          <button
            type="submit"
            disabled={!smartInputText.trim() || isParsingSmart}
            className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 disabled:opacity-40 hover:opacity-90 transition flex items-center justify-center cursor-pointer flex-shrink-0"
            title="Schedule with AI"
          >
            {isParsingSmart ? (
              <MaterialIcon name="progress_activity" size={16} className="animate-spin" />
            ) : (
              <MaterialIcon name="auto_awesome" size={16} filled />
            )}
          </button>
        </form>
      </section>

      {/* Toast Notice */}
      <AnimatePresence>
        {smartNotice && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="px-4 py-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] flex items-center justify-between shadow-sm"
          >
            <span>{smartNotice}</span>
            <button onClick={() => setSmartNotice(null)} className="p-1 text-[var(--color-muted)] flex items-center justify-center">
              <MaterialIcon name="close" size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. 31-DAY MONTHLY CALENDAR GRID WITH MULTI-COLORED DOT INDICATORS */}
      <section className="bg-[var(--color-surface)] rounded-3xl p-5 md3-elevation-1 border border-[var(--color-hairline)] space-y-3">
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] uppercase tracking-wider text-[var(--color-muted)] font-bold pb-2 border-b border-[var(--color-hairline)]">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Matrix */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {monthMatrix.flat().map((cell, idx) => {
            const hasTasks = tasks.some(t => t.date === cell.dateStr);
            const hasDiary = diaryEntries.some(d => d.date === cell.dateStr);
            const hasImportant = importantDates.some(d => {
              if (d.date === cell.dateStr) return true;
              if (d.yearlyRepeat) {
                const [, m, day] = d.date.split('-');
                const [, cm, cday] = cell.dateStr.split('-');
                return m === cm && day === cday;
              }
              return false;
            });

            const isSelected = selectedDayStr === cell.dateStr;
            const isTodayCell = cell.isToday;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDayStr(cell.dateStr)}
                className={`h-12 rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer active:scale-95 ${
                  !cell.isCurrentMonth
                    ? 'opacity-30'
                    : isSelected
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)] font-bold shadow-sm'
                    : 'hover:bg-[var(--color-paper)] text-[var(--color-ink)]'
                }`}
              >
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isTodayCell && !isSelected
                      ? 'w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold'
                      : ''
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {/* Multi-Colored Dot Indicators Directly Beneath Date Numbers */}
                <div className="flex gap-1 mt-1 h-1 items-center justify-center">
                  {hasImportant && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Milestone" />
                  )}
                  {hasTasks && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" title="Tasks" />
                  )}
                  {hasDiary && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Diary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dot Legend */}
        <div className="mt-3 pt-3 border-t border-[var(--color-hairline)] flex items-center justify-around text-[10px] font-mono text-[var(--color-muted)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Milestones</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>Tasks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Diary</span>
          </div>
        </div>
      </section>

      {/* 3. AGENDA (DAILY TIMELINE LIST WITH CIRCULAR CHECKBOXES) */}
      <section className="bg-[var(--color-surface)] rounded-3xl p-5 md3-elevation-1 border border-[var(--color-hairline)] space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-muted)] block font-semibold">
              Daily Timeline
            </span>
            <h3 className="font-serif text-lg font-bold text-[var(--color-ink)] mt-0.5">
              {weekday}, {dayAndMonth}
            </h3>
          </div>
          <button
            onClick={() => onSelectDateForToday(selectedDayStr)}
            className="text-xs font-medium text-[var(--color-saffron)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open on Today rail</span>
            <MaterialIcon name="arrow_forward" size={16} />
          </button>
        </div>

        {/* Agenda Cards */}
        <div className="space-y-2 pt-1">
          {/* Milestones on this day */}
          {selectedImportant.map(d => (
            <div
              key={d.id}
              className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <MaterialIcon name="event" size={18} filled className="text-amber-600" />
                <span className="text-xs font-semibold text-[var(--color-ink)]">{d.title}</span>
                {d.yearlyRepeat && <MaterialIcon name="repeat" size={16} className="text-amber-600" />}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/50 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-bold">
                Milestone
              </span>
            </div>
          ))}

          {/* Tasks with circular checkboxes */}
          {selectedDayTasks.map(task => (
            <div
              key={task.id}
              onClick={() => onToggleTask && onToggleTask(task.id)}
              className="p-3.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] flex items-center justify-between hover:border-[var(--color-saffron)] transition cursor-pointer active:scale-[0.99] select-none shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    task.completed
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                      : 'border-stone-400 dark:border-stone-600 bg-transparent hover:border-emerald-500'
                  }`}
                >
                  {task.completed && <MaterialIcon name="check" size={16} weight={700} />}
                </div>
                <span className="font-mono text-xs font-bold text-stone-500 dark:text-stone-400">
                  {task.time}
                </span>
                <span className={`text-xs font-medium ${task.completed ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-900 dark:text-stone-100'}`}>
                  {task.title}
                </span>
              </div>
            </div>
          ))}

          {selectedDayTasks.length === 0 && selectedImportant.length === 0 && !selectedDayDiary && (
            <p className="text-xs text-[var(--color-muted)] py-4 text-center italic font-serif">
              No tasks or milestones for this date.
            </p>
          )}
        </div>
      </section>

      {/* 4. UPCOMING MILESTONES & DEADLINES (COMPACT CARDS WITH COUNTDOWN CHIPS) */}
      <section className="bg-[var(--color-surface)] rounded-3xl p-5 md3-elevation-1 border border-[var(--color-hairline)] space-y-3">
        <h3 className="font-serif text-lg font-bold text-[var(--color-ink)]">
          Upcoming Milestones & Deadlines
        </h3>

        {upcomingList.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)] py-4 text-center italic font-serif">
            No upcoming milestones recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingList.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                    <MaterialIcon name="event" size={20} filled />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--color-ink)]">{item.title}</h4>
                    <span className="text-[10px] font-mono text-[var(--color-muted)]">
                      {formatShortDate(item.effectiveDate)} {item.yearlyRepeat && '• Annual'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Countdown chip (e.g. "in 11 days") */}
                  <span className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                    {getRelativeDateLabel(item.effectiveDate, todayStr)}
                  </span>
                  <button
                    onClick={() => handleDeleteImportantDate(item.id)}
                    className="p-1 text-[var(--color-muted)] hover:text-red-500 flex items-center justify-center cursor-pointer"
                    aria-label="Delete milestone"
                  >
                    <MaterialIcon name="delete" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL: ADD MILESTONE / DEADLINE */}
      <AnimatePresence>
        {isAddingDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] shadow-2xl"
            >
              <h3 className="font-serif text-xl font-bold">Add Milestone or Deadline</h3>
              <form onSubmit={handleSaveImportantDate} className="mt-4 space-y-3.5">
                <input
                  type="text"
                  required
                  placeholder="e.g. Quarterly Product Launch"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-sm"
                />
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] font-mono text-sm"
                />
                <label className="flex items-center gap-2 text-xs text-[var(--color-ink)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newYearlyRepeat}
                    onChange={e => setNewYearlyRepeat(e.target.checked)}
                    className="rounded text-[var(--color-saffron)]"
                  />
                  <span>Repeats Yearly (Anniversary, Annual Milestone)</span>
                </label>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAddingDate(false)} className="px-4 py-2 text-xs">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-full bg-[var(--color-saffron)] text-white text-xs font-semibold">
                    Save Milestone
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
