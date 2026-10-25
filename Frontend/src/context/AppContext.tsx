import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Task, ChatMessage, PlanChangeProposal } from '../types';
import { api, ApiError, User, Workspace, MockIntegration } from '../services/api';
import { plannedLabel } from '../engine/scheduleDisplay';

const empty: Workspace = { tasks: [], calendarEvents: [], briefing: {}, status: 'empty', mockNow: '', capacitySummary: {} };
function useWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(empty);
  const [completedScheduleTasks, setCompletedScheduleTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [briefingBusy, setBriefingBusy] = useState(false);
  const [briefingError, setBriefingError] = useState('');
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
    setCompletedScheduleTasks([]);
    setUser(identity);
    let data = await api.workspace();
    if (!data.tasks || data.tasks.length === 0) {
      try { data = await api.sync(); } catch {}
    }
    accept(data);
    setChatMessages([]);
  });

  const logout = () => run(async () => {
    await api.logout(); setUser(null); setWorkspace(empty); setChatMessages([]); setCompletedScheduleTasks([]); setSelectedTaskForReason(null);
  });

  const syncMock = (integrations?: MockIntegration[], reset = false) => run(async () => { accept(await api.sync(integrations, reset)); if (reset) { setChatMessages([]); setSelectedTaskForReason(null); } });
  const refresh = () => run(async () => accept(await api.refresh()));
  const retryBriefing = () => run(async () => {
    setBriefingBusy(true);
    setBriefingError('');
    try { accept(await api.retryBriefing()); }
    catch (e) {
      setBriefingError(e instanceof Error ? e.message : 'Could not request a briefing. Please try again.');
      throw e;
    } finally { setBriefingBusy(false); }
  });
  const editTask = (id: string, version: number, patch: object) => run(async () => accept(await api.edit(id, { version, ...patch })));

  const toggleTaskComplete = (id: string) => {
    const task = workspace.tasks.find(t => t.id === id);
    const completed = workspace.completedTasks?.find(t => t.id === id);
    const target = task || completed;
    if (!target) return;
    void run(async () => {
      if (task) {
        // Preserve the existing time blocks so the schedule can show completion
        // immediately, even while the server prepares its revised plan.
        setCompletedScheduleTasks(previous => [
          ...previous.filter(item => item.id !== id), { ...task, status: 'completed' },
        ]);
        setWorkspace(previous => ({
          ...previous,
          tasks: previous.tasks.filter(item => item.id !== id),
          completedTasks: [...(previous.completedTasks || []), { id, title: task.title, version: task.version! }],
        }));
      }
      try {
        accept(await api.edit(id, { version: target.version!, status: task ? 'completed' : 'pending' }));
      } catch (e) {
        setWorkspace(workspace);
        if (task) setCompletedScheduleTasks(previous => previous.filter(item => item.id !== id));
        throw e;
      }
    });
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
      const res = await api.chat(text, taskContext, workspace.runId);
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
    ...workspace, user, loading, busy, chatBusy, briefingBusy, briefingError, retryBriefing, error, authenticate, logout, syncMock, refresh, editTask, capacity,
    scheduleTasks: [...workspace.tasks, ...completedScheduleTasks.filter(task =>
      !workspace.tasks.some(item => item.id === task.id) &&
      workspace.completedTasks?.some(item => item.id === task.id)
    )],
    chatMessages, activeView, selectedTaskForReason, setActiveView, setSelectedTaskForReason, toggleTaskComplete,
    sendChatMessage, resetToDemoSeed: () => syncMock(),
    updateTaskPriority: (_id: string, _bucket: string) => setError('Edit task facts to recalculate priority. Buckets are assigned by the engine.'),
    applyPlanProposal: (proposal: PlanChangeProposal) => run(async () => {
      const data = await api.applyPlan(proposal);
      accept(data);
      const changes = proposal.moves.map(move => {
        const task = data.tasks.find(item => item.id === move.taskId);
        return task ? `${task.title}: ${task.priorityBucket.toUpperCase()} · Planned ${plannedLabel(task, data.mockNow)}.` : '';
      }).filter(Boolean);
      setChatMessages(previous => previous.map(message => message.proposal?.id === proposal.id
        ? { ...message, text: ['Schedule rebuilt and saved.', ...changes].join('\n'), proposal: { ...proposal, requiresApproval: false } }
        : message));
    }),
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

