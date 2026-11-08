import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verifyPin } from './crypto';
import { addRoutinesToDay } from './storage';
import {
  compareTimes,
  getDaysDifference,
  getRelativeDateLabel,
  formatDateToString,
  formatStampedDate,
  getTimeOfDayInfo,
} from './date';
import { Task, Routine } from '../types';

test('crypto: PIN hashing and verification works', async () => {
  const pin = '4829';
  const { hash, salt } = await hashPin(pin);
  assert.ok(hash.length > 20, 'Hash should be a SHA-256 hex string');
  assert.ok(salt.length > 10, 'Salt should be non-empty');

  const isValid = await verifyPin('4829', hash, salt);
  assert.equal(isValid, true, 'Correct PIN should verify as true');

  const isInvalid = await verifyPin('0000', hash, salt);
  assert.equal(isInvalid, false, 'Wrong PIN should verify as false');
});

test('storage: addRoutinesToDay copies routines without duplicating', () => {
  const today = '2026-10-28';
  const existingTasks: Task[] = [
    { id: 't1', date: today, title: 'Existing Morning Task', time: '07:00', completed: false },
  ];
  const routines: Routine[] = [
    { id: 'r1', title: 'Morning Stillness', time: '06:30', order: 1 },
    { id: 'r2', title: 'Evening Walk', time: '18:00', order: 2 },
  ];

  const result1 = addRoutinesToDay(today, existingTasks, routines);
  assert.equal(result1.addedCount, 2);
  assert.equal(result1.updatedTasks.length, 3);

  // Calling it again should add 0 duplicates
  const result2 = addRoutinesToDay(today, result1.updatedTasks, routines);
  assert.equal(result2.addedCount, 0);
  assert.equal(result2.updatedTasks.length, 3);
});

test('date: comparison, differences and stamping behave accurately', () => {
  assert.ok(compareTimes('08:00', '12:30') < 0);
  assert.ok(compareTimes('14:00', '09:00') > 0);
  assert.equal(compareTimes('10:00', '10:00'), 0);

  assert.equal(getDaysDifference('2026-10-20', '2026-10-25'), 5);
  assert.equal(getRelativeDateLabel('2026-10-28', '2026-10-28'), 'Today');
  assert.equal(getRelativeDateLabel('2026-10-29', '2026-10-28'), 'Tomorrow');
  assert.equal(getRelativeDateLabel('2026-10-27', '2026-10-28'), 'Yesterday');
  assert.equal(getRelativeDateLabel('2026-11-02', '2026-10-28'), 'in 5 days');

  // Verify stamped date formatting
  const stamped = formatStampedDate('2026-10-30');
  assert.equal(stamped, 'Friday 30 Oct 2026');
});

test('date: time-of-day hero logic shifts by schedule', () => {
  const morning = getTimeOfDayInfo(9);
  assert.equal(morning.period, 'morning');
  assert.equal(morning.greeting, 'Good morning');
  assert.equal(morning.accentColor, 'var(--color-saffron)');

  const afternoon = getTimeOfDayInfo(15);
  assert.equal(afternoon.period, 'afternoon');
  assert.equal(afternoon.greeting, 'Good afternoon');
  assert.equal(afternoon.accentColor, 'var(--color-teal)');

  const evening = getTimeOfDayInfo(19);
  assert.equal(evening.period, 'evening');
  assert.equal(evening.greeting, 'Good evening');
  assert.equal(evening.accentColor, 'var(--color-indigo)');

  const night = getTimeOfDayInfo(23);
  assert.equal(night.period, 'night');
  assert.equal(night.greeting, 'Quiet night');
  assert.equal(night.accentColor, 'var(--color-ink-deep)');
});

test('ai: offline natural language heuristic extracts times', async () => {
  const { parseNaturalLanguageSchedule } = await import('./ai');
  const result = await parseNaturalLanguageSchedule('Call investor at 14:30 tomorrow', '2026-11-04');
  assert.ok(result.items.length > 0, 'Should extract items');
  assert.equal(result.items[0].time, '14:30', 'Should extract 14:30');
});

