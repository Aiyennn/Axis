import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Task, ChatMessage, PlanChangeProposal } from '../types';
import { api, ApiError, User, Workspace, MockIntegration } from '../services/api';

const empty: Workspace = { tasks: [], calendarEvents: [], briefing: {}, status: 'empty', mockNow: '', capacitySummary: {} };
function useWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'timeline' | 'integrations'>('dashboard');
  const [selectedTaskForReason, setSelectedTaskForReason] = useState<Task | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    api.me().then(async identity => {
      const data = await api.workspace();
      if (active) { setUser(identity); setWorkspace(data); }
    }).catch(e => { if (active && !(e instanceof ApiError && e.status === 401)) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const run = async (operation: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await operation(); }
    catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      if (e instanceof ApiError && e.status === 401) { setUser(null); setWorkspace(empty); setSelectedTaskForReason(null); }
    } finally { inFlight.current = false; setBusy(false); }
  };

  const accept = (data: Workspace) => {
    setWorkspace(data);
    setSelectedTaskForReason(previous => data.tasks.find(t => t.id === previous?.id) || null);
  };

  const authenticate = (mode: 'login' | 'register', email: string, password: string) => run(async () => {
    const identity = await api.authenticate(mode, email, password);
    setUser(identity);
    let data = await api.workspace();
    if (!data.tasks || data.tasks.length === 0) {
      try { data = await api.sync(); } catch {}
    }
    accept(data);
    setChatMessages([]);
  });

  const logout = () => run(async () => {
    await api.logout(); setUser(null); setWorkspace(empty); setChatMessages([]); setSelectedTaskForReason(null);
  });

  const syncMock = (integrations?: MockIntegration[]) => run(async () => accept(await api.sync(integrations)));
  const refresh = () => run(async () => accept(await api.refresh()));
  const editTask = (id: string, version: number, patch: object) => run(async () => accept(await api.edit(id, { version, ...patch })));

  const toggleTaskComplete = (id: string) => {
    const task = workspace.tasks.find(t => t.id === id);
    const completed = workspace.completedTasks?.find(t => t.id === id);
    if (task || completed) void editTask(id, (task || completed)!.version!, { status: task ? 'completed' : 'pending' });
  };

  const sendChatMessage = async (text: string) => {
    if (!text.trim() || chatBusy) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(previous => [
      ...previous,
      { id: crypto.randomUUID(), sender: 'user', text, timestamp },
    ]);
    setChatBusy(true);

    try {
      const taskContext = (workspace.tasks || []).map(t => ({
        id: t.id,
        title: t.title,
        priorityBucket: t.priorityBucket,
        deadline: t.deadline,
        estimatedHours: t.estimatedHours,
        importance: t.importance,
        reasoning: t.reasoning,
      }));
      const res = await api.chat(text, taskContext);
      const reply = res.reply || "Oops Axis is not available at the moment please try again later";
      setChatMessages(previous => [
        ...previous,
        {
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          proposal: res.proposal as PlanChangeProposal | undefined,
        },
      ]);
    } catch {
      setChatMessages(previous => [
        ...previous,
        {
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: "Oops Axis is not available at the moment please try again later",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  const capacity = {
    totalWorkloadHours: workspace.capacitySummary.knownRemainingHours || 0,
    availableFreeHours: workspace.capacitySummary.availableWorkingHoursToday || 0,
    deficitHours: Math.max(0, (workspace.capacitySummary.knownRemainingHours || 0) - (workspace.capacitySummary.availableWorkingHoursToday || 0)),
    isOverloaded: (workspace.capacitySummary.knownRemainingHours || 0) > (workspace.capacitySummary.availableWorkingHoursToday || 0),
  };

  return {
    ...workspace, user, loading, busy, chatBusy, error, authenticate, logout, syncMock, refresh, editTask, capacity,
    chatMessages, activeView, selectedTaskForReason, setActiveView, setSelectedTaskForReason, toggleTaskComplete,
    sendChatMessage, resetToDemoSeed: () => syncMock(),
    updateTaskPriority: (_id: string, _bucket: string) => setError('Edit task facts to recalculate priority. Buckets are assigned by the engine.'),
    applyPlanProposal: async (_proposal: PlanChangeProposal) => setError('Legacy bucket proposals are unavailable. Edit task facts instead.'),
  };
}

const AppContext = createContext<ReturnType<typeof useWorkspace> | undefined>(undefined);
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  <AppContext.Provider value={useWorkspace()}>{children}</AppContext.Provider>;
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
