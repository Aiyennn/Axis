import type { Task, CalendarEvent } from '../types';

export interface TimelineBlock {
  id: string;
  title: string;
  subtitle?: string;
  type: 'event' | 'focus' | 'open';
  startHour: number; // e.g. 8.0 = 8:00 AM, 9.5 = 9:30 AM
  endHour: number;
  durationHours: number;
  task?: Task;
  event?: CalendarEvent;
}

export const DAY_START_HOUR = 9.0;   // 8:00 AM
export const DAY_END_HOUR = 18.0;    // 10:00 PM
export const TOTAL_DAY_HOURS = DAY_END_HOUR - DAY_START_HOUR; // 14 hours

/**
 * Format decimal hours to readable 12-hour string (e.g., 9.5 -> "9:30 AM", 14.0 -> "2:00 PM")
 */
export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m === 0 ? '00' : m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${period}`;
}

/** Display saved engine allocations; never rank or schedule tasks in the browser. */
export function generateDailyTimeline(tasks: Task[], calendarEvents: CalendarEvent[]): TimelineBlock[] {
  const blocks: TimelineBlock[] = calendarEvents.map<TimelineBlock>(event => ({
    id: event.id, title: event.title, type: 'event', event,
    startHour: Math.max(DAY_START_HOUR, event.startHour), endHour: Math.min(DAY_END_HOUR, event.endHour),
    durationHours: Math.max(0, Math.min(DAY_END_HOUR, event.endHour) - Math.max(DAY_START_HOUR, event.startHour)),
    subtitle: event.displayTime,
  })).filter(b => b.durationHours > 0);
  // Mock scenario's date and timezone match the server's explicit clock.
  const midnight = Date.parse('2026-10-20T00:00:00+08:00');
  for (const task of tasks) for (const [i, work] of (task.plannedWork || []).entries()) {
    const startHour = Math.max(DAY_START_HOUR, (Date.parse(work.start) - midnight) / 3600000);
    const endHour = Math.min(DAY_END_HOUR, (Date.parse(work.end) - midnight) / 3600000);
    if (endHour > startHour) blocks.push({ id: `${task.id}-${i}`, title: task.title, type: 'focus', task,
      startHour, endHour, durationHours: endHour - startHour, subtitle: 'Proposed focus block' });
  }
  blocks.sort((a, b) => a.startHour - b.startHour);
  const gaps: TimelineBlock[] = [];
  let cursor = DAY_START_HOUR;
  for (const block of blocks) {
    if (block.startHour > cursor) gaps.push({ id: `open-${cursor}`, title: 'Open window', type: 'open', startHour: cursor, endHour: block.startHour, durationHours: block.startHour - cursor });
    cursor = Math.max(cursor, block.endHour);
  }
  if (cursor < DAY_END_HOUR) gaps.push({ id: `open-${cursor}`, title: 'Open window', type: 'open', startHour: cursor, endHour: DAY_END_HOUR, durationHours: DAY_END_HOUR - cursor });
  return [...blocks, ...gaps].sort((a, b) => a.startHour - b.startHour);
}
