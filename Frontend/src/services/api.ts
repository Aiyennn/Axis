import type { Task, CalendarEvent } from '../types';

export type MockIntegration = 'canvas' | 'google_calendar' | 'gmail' | 'github' | 'notion' | 'manual';

export interface User { id: string; email: string; name: string }
export interface Workspace {
  tasks: Task[];
  completedTasks?: { id: string; title: string; version: number }[];
  calendarEvents: CalendarEvent[];
  briefing: { summary?: string; tradeOffs?: string[] };
  status: string;
  mockNow: string;
  capacitySummary: { knownRemainingHours?: number; unknownEffortTaskCount?: number; availableWorkingHoursToday?: number };
  importResult?: { mode: string; created: number; revised: number; unchanged: number; issues: { code: string }[] };
}
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method, credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Axis-Request': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(typeof data.detail === 'string' ? data.detail : 'Request failed. Check your input and try again.', response.status);
  }
  return response.json();
}
export const api = {
  me: () => request<User>('/auth/me'),
  authenticate: (mode: 'login' | 'register', email: string, password: string) => request<User>(`/auth/${mode}`, 'POST', { email, password }),
  logout: () => request('/auth/logout', 'POST'),
  workspace: () => request<Workspace>('/workspace'),
  sync: (integrations?: MockIntegration[]) => request<Workspace>('/workspace/sync-mock', 'POST', integrations ? { integrations } : undefined),
  refresh: () => request<Workspace>('/workspace/refresh', 'POST'),
  edit: (id: string, patch: object) => request<Workspace>(`/workspace/tasks/${encodeURIComponent(id)}`, 'PATCH', patch),
  chat: (message: string, tasks?: unknown[]) => request<{ reply: string; proposal?: unknown; engine?: string }>('/chat', 'POST', { message, tasks }),
};
