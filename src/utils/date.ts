/**
 * Date formatting and calendar helper utilities
 */

export function getTodayString(): string {
  const now = new Date();
  return formatDateToString(now);
}

export function formatDateToString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatHeroDate(dateStr: string): { weekday: string; dayAndMonth: string; year: string } {
  const date = parseDateString(dateStr);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear().toString();
  
  return {
    weekday,
    dayAndMonth: `${day} ${month}`,
    year,
  };
}

export function formatStampedDate(dateStr: string): string {
  const date = parseDateString(dateStr);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${weekday} ${day} ${month} ${year}`;
}

export function formatShortDate(dateStr: string): string {
  const date = parseDateString(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function compareTimes(timeA: string, timeB: string): number {
  return timeA.localeCompare(timeB);
}

export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = parseDateString(dateStr1).getTime();
  const d2 = parseDateString(dateStr2).getTime();
  const diffTime = d2 - d1;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getRelativeDateLabel(targetDateStr: string, todayStr: string = getTodayString()): string {
  const diff = getDaysDifference(todayStr, targetDateStr);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export type TimeOfDayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TimeOfDayInfo {
  period: TimeOfDayPeriod;
  greeting: string;
  heroBgClass: string;
  heroBorderClass: string;
  accentColor: string;
}

export function getTimeOfDayInfo(hour: number = new Date().getHours()): TimeOfDayInfo {
  if (hour < 12) {
    return {
      period: 'morning',
      greeting: 'Good morning',
      heroBgClass: 'bg-[var(--color-saffron)]',
      heroBorderClass: 'border-[var(--color-saffron)]',
      accentColor: 'var(--color-saffron)',
    };
  } else if (hour < 18) {
    return {
      period: 'afternoon',
      greeting: 'Good afternoon',
      heroBgClass: 'bg-[var(--color-teal)]',
      heroBorderClass: 'border-[var(--color-teal)]',
      accentColor: 'var(--color-teal)',
    };
  } else if (hour < 22) {
    return {
      period: 'evening',
      greeting: 'Good evening',
      heroBgClass: 'bg-[var(--color-indigo)]',
      heroBorderClass: 'border-[var(--color-indigo)]',
      accentColor: 'var(--color-indigo)',
    };
  } else {
    return {
      period: 'night',
      greeting: 'Quiet night',
      heroBgClass: 'bg-[var(--color-ink-deep)]',
      heroBorderClass: 'border-[var(--color-ink-deep)]',
      accentColor: 'var(--color-ink-deep)',
    };
  }
}

export interface CalendarDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function getMonthMatrix(year: number, month: number, todayStr: string = getTodayString()): CalendarDay[][] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Starting day of week: Sunday = 0
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  const matrix: CalendarDay[][] = [];
  let currentWeek: CalendarDay[] = [];
  
  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, dayNumber);
    const dateStr = formatDateToString(prevDate);
    currentWeek.push({
      dateStr,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }
  
  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const thisDate = new Date(year, month, day);
    const dateStr = formatDateToString(thisDate);
    currentWeek.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
    
    if (currentWeek.length === 7) {
      matrix.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // Next month leading days to complete week
  if (currentWeek.length > 0) {
    let nextDayNumber = 1;
    while (currentWeek.length < 7) {
      const nextDate = new Date(year, month + 1, nextDayNumber);
      const dateStr = formatDateToString(nextDate);
      currentWeek.push({
        dateStr,
        dayNumber: nextDayNumber,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
      nextDayNumber++;
    }
    matrix.push(currentWeek);
  }
  
  return matrix;
}
