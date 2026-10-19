/**
 * scheduler.ts
 * Capacity calculations for the Daily Briefing banner.
 *
 * Model:
 *   - Productive window: 8 AM – 10 PM (14 hours)
 *   - Calendar events eat into that window
 *   - Remaining hours are "free hours"
 *   - Task workload = sum of estimatedHours for tasks that are NOT completed
 *   - isOverloaded = workload > freeHours
 */

import type { Task, CalendarEvent } from '../types';

export interface CapacityResult {
  totalWorkloadHours: number;
  availableFreeHours: number;
  isOverloaded: boolean;
  deficitHours: number; // positive when overloaded, 0 otherwise
}

const PRODUCTIVE_WINDOW_HOURS = 14; // 8 AM – 10 PM

/**
 * Sums the duration of calendar events in hours.
 * Duration is derived from endHour - startHour (both stored as decimal hours,
 * e.g. 9.5 = 9:30 AM, 11.0 = 11:00 AM).
 */
function sumCalendarEventHours(events: CalendarEvent[]): number {
  return events.reduce((acc, ev) => {
    const hours = Math.max(0, ev.endHour - ev.startHour);
    return acc + hours;
  }, 0);
}

/**
 * Calculates today's capacity snapshot.
 */
export function calculateCapacity(
  tasks: Task[],
  calendarEvents: CalendarEvent[]
): CapacityResult {
  const busyHours = sumCalendarEventHours(calendarEvents);
  const availableFreeHours = Math.max(0, PRODUCTIVE_WINDOW_HOURS - busyHours);

  const totalWorkloadHours = tasks
    .filter((t) => t.status !== 'completed')
    .reduce((acc, t) => acc + (t.estimatedHours ?? 0), 0);

  const isOverloaded = totalWorkloadHours > availableFreeHours;
  const deficitHours = isOverloaded
    ? parseFloat((totalWorkloadHours - availableFreeHours).toFixed(1))
    : 0;

  return {
    totalWorkloadHours: parseFloat(totalWorkloadHours.toFixed(1)),
    availableFreeHours: parseFloat(availableFreeHours.toFixed(1)),
    isOverloaded,
    deficitHours,
  };
}

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

export const DAY_START_HOUR = 8.0;   // 8:00 AM
export const DAY_END_HOUR = 22.0;    // 10:00 PM
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

/**
 * Generates non-overlapping timeline blocks (calendar events + AI-allocated focus blocks + open slots)
 * for the 8:00 AM – 10:00 PM day window.
 */
export function generateDailyTimeline(
  tasks: Task[],
  calendarEvents: CalendarEvent[]
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  // 1. Sort calendar events within our day window
  const sortedEvents = [...calendarEvents]
    .filter((e) => e.endHour > DAY_START_HOUR && e.startHour < DAY_END_HOUR)
    .sort((a, b) => a.startHour - b.startHour);

  // 2. Identify open intervals between calendar events
  interface Interval {
    start: number;
    end: number;
  }
  const openIntervals: Interval[] = [];
  let pointer = DAY_START_HOUR;

  for (const ev of sortedEvents) {
    const clampedStart = Math.max(DAY_START_HOUR, ev.startHour);
    const clampedEnd = Math.min(DAY_END_HOUR, ev.endHour);

    if (clampedStart > pointer) {
      openIntervals.push({ start: pointer, end: clampedStart });
    }
    pointer = Math.max(pointer, clampedEnd);
  }

  if (pointer < DAY_END_HOUR) {
    openIntervals.push({ start: pointer, end: DAY_END_HOUR });
  }

  // 3. Collect active pending tasks, ordered by priority bucket (now > next > later) then score desc
  const bucketRank = { now: 3, next: 2, later: 1 };
  const pendingTasks = tasks
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => {
      const rankDiff = (bucketRank[b.priorityBucket] || 0) - (bucketRank[a.priorityBucket] || 0);
      if (rankDiff !== 0) return rankDiff;
      return (b.priorityScore || 0) - (a.priorityScore || 0);
    });

  // Track remaining hours for each task
  const taskRemaining = pendingTasks.map((t) => ({
    task: t,
    remainingHours: t.estimatedHours || 1.0,
  }));

  let taskIdx = 0;

  // 4. Fill open intervals with tasks
  for (const interval of openIntervals) {
    let slotPointer = interval.start;
    const slotEnd = interval.end;

    while (slotPointer < slotEnd && taskIdx < taskRemaining.length) {
      const current = taskRemaining[taskIdx];
      const slotAvailable = slotEnd - slotPointer;

      if (slotAvailable < 0.25) {
        // Less than 15 minutes left in slot, leave as small break
        break;
      }

      const allocatedHours = Math.min(current.remainingHours, slotAvailable);
      const roundedHours = Math.round(allocatedHours * 10) / 10;

      if (roundedHours > 0) {
        blocks.push({
          id: `focus-${current.task.id}-${slotPointer.toFixed(1)}`,
          title: current.task.title,
          subtitle: `Focus Block • ${roundedHours}h`,
          type: 'focus',
          startHour: slotPointer,
          endHour: slotPointer + roundedHours,
          durationHours: roundedHours,
          task: current.task,
        });

        current.remainingHours -= roundedHours;
        slotPointer += roundedHours;

        if (current.remainingHours <= 0.1) {
          taskIdx++;
        }
      } else {
        break;
      }
    }

    // Any remaining time in this interval is open
    if (slotPointer < slotEnd) {
      const openDuration = Math.round((slotEnd - slotPointer) * 10) / 10;
      if (openDuration >= 0.25) {
        blocks.push({
          id: `open-${slotPointer.toFixed(1)}`,
          title: 'Open Window',
          subtitle: `${openDuration}h Available`,
          type: 'open',
          startHour: slotPointer,
          endHour: slotEnd,
          durationHours: openDuration,
        });
      }
    }
  }

  // 5. Add calendar events as blocks
  for (const ev of sortedEvents) {
    const start = Math.max(DAY_START_HOUR, ev.startHour);
    const end = Math.min(DAY_END_HOUR, ev.endHour);
    const duration = Math.round((end - start) * 10) / 10;

    blocks.push({
      id: `cal-block-${ev.id}`,
      title: ev.title,
      subtitle: ev.displayTime,
      type: 'event',
      startHour: start,
      endHour: end,
      durationHours: duration,
      event: ev,
    });
  }

  // 6. Return all blocks ordered by startHour
  return blocks.sort((a, b) => a.startHour - b.startHour);
}

