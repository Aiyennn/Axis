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
