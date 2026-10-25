import type { Task } from '../types';

export const DEMO_NOW = '2026-10-20T08:00:00+08:00';
const zone = 'Asia/Shanghai';

export function scheduleDay(timestamp: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const part = (name: string) => parts.find(item => item.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function scheduleTime(timestamp: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}

export function scheduleDayLabel(timestamp: string, now = DEMO_NOW): string {
  const date = scheduleDay(timestamp);
  const today = scheduleDay(now || DEMO_NOW);
  if (date === today) return 'Today';
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (date === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(timestamp));
}

export function firstPlannedStart(task: Task): string | undefined {
  return task.plannedWork?.map(block => block.start).filter(start => Number.isFinite(Date.parse(start)))
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
}

export function plannedLabel(task: Task, now = DEMO_NOW): string {
  const start = firstPlannedStart(task);
  return start ? `${scheduleDayLabel(start, now)}, ${scheduleTime(start)}` : 'Not scheduled yet';
}

export function currentFocusTask(tasks: Task[]): Task | undefined {
  return tasks.find(task => task.status === 'pending' && task.priorityBucket === 'now');
}

export function upcomingWork(tasks: Task[], now = DEMO_NOW) {
  const today = scheduleDay(now || DEMO_NOW);
  return tasks.filter(task => task.status === 'pending').flatMap(task =>
    (task.plannedWork || []).map((work, index) => ({ ...work, task, id: `${task.id}-${index}` }))
  ).filter(work => Number.isFinite(Date.parse(work.start)) && Number.isFinite(Date.parse(work.end)) &&
    scheduleDay(work.start) > today).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
