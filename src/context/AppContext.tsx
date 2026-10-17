import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task, CalendarEvent, ChatMessage, PriorityBucket, PlanChangeProposal } from '../types';
import { INITIAL_TASKS, INITIAL_CALENDAR_EVENTS, INITIAL_MESSAGES } from '../data/seedData';

interface AppContextType {
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  chatMessages: ChatMessage[];
  activeView: 'dashboard' | 'integrations';
  selectedTaskForReason: Task | null;
  setActiveView: (view: 'dashboard' | 'integrations') => void;
  setSelectedTaskForReason: (task: Task | null) => void;
  toggleTaskComplete: (taskId: string) => void;
  updateTaskPriority: (taskId: string, newBucket: PriorityBucket) => void;
  applyPlanProposal: (proposal: PlanChangeProposal) => void;
  addMockTask: (newTask: Partial<Task> & { title: string; deadline: string; estimatedHours: number }) => void;
  resetToDemoSeed: () => void;
  sendChatMessage: (userText: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const TASKS_STORAGE_KEY = 'axis_tasks_v1';
const CALENDAR_STORAGE_KEY = 'axis_calendar_v1';
const CHAT_STORAGE_KEY = 'axis_chat_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [calendarEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem(CALENDAR_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_CALENDAR_EVENTS;
    } catch {
      return INITIAL_CALENDAR_EVENTS;
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [activeView, setActiveView] = useState<'dashboard' | 'integrations'>('dashboard');
  const [selectedTaskForReason, setSelectedTaskForReason] = useState<Task | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Ignore write errors
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch {
      // Ignore write errors
    }
  }, [chatMessages]);

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const updateTaskPriority = (taskId: string, newBucket: PriorityBucket) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, priorityBucket: newBucket };
      }
      return t;
    }));
  };

  const applyPlanProposal = (proposal: PlanChangeProposal) => {
    setTasks(prev => {
      return prev.map(task => {
        const move = proposal.moves.find(m => m.taskId === task.id);
        if (move) {
          return { ...task, priorityBucket: move.toBucket };
        }
        return task;
      });
    });

    // Mark proposal as approved in messages
    setChatMessages(prev => prev.map(msg => {
      if (msg.proposal && msg.proposal.id === proposal.id) {
        return {
          ...msg,
          proposal: { ...msg.proposal, requiresApproval: false }
        };
      }
      return msg;
    }));

    // Add confirmation message
    const confirmMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'assistant',
      text: "Plan updated! I've rescheduled your priorities. Exam preparation is now in Do Now, and client work has been adjusted accordingly.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, confirmMsg]);
  };

  const addMockTask = (newTaskData: Partial<Task> & { title: string; deadline: string; estimatedHours: number }) => {
    const newTask: Task = {
      id: 'task-' + Date.now(),
      title: newTaskData.title,
      description: newTaskData.description || 'Custom mock task added for testing.',
      source: newTaskData.source || 'task',
      sourceLabel: newTaskData.sourceLabel || 'Custom Entry',
      deadline: newTaskData.deadline,
      isHardDeadline: newTaskData.isHardDeadline ?? false,
      estimatedHours: newTaskData.estimatedHours,
      importance: newTaskData.importance || 'medium',
      status: 'pending',
      priorityScore: newTaskData.priorityScore || 65,
      priorityBucket: newTaskData.priorityBucket || 'next',
      scoreBreakdown: newTaskData.scoreBreakdown || {
        deadlineProximity: 20,
        consequenceWeight: 15,
        calendarFit: 15,
        importanceScore: 15
      },
      reasoning: newTaskData.reasoning || 'Custom task added via demo controls.',
      consequencesOfDelay: newTaskData.consequencesOfDelay || 'Flexible task consequences.'
    };

    setTasks(prev => [newTask, ...prev]);
  };

  const resetToDemoSeed = () => {
    localStorage.removeItem(TASKS_STORAGE_KEY);
    localStorage.removeItem(CALENDAR_STORAGE_KEY);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setTasks(INITIAL_TASKS);
    setChatMessages(INITIAL_MESSAGES);
    setSelectedTaskForReason(null);
  };

  const sendChatMessage = (userText: string) => {
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const lower = userText.toLowerCase();
    let assistantMsg: ChatMessage;

    // Check if user is challenging priorities for exam prep vs client revision
    if (lower.includes('exam') || lower.includes('study')) {
      const proposal: PlanChangeProposal = {
        id: 'prop-' + Date.now(),
        requestedPrompt: userText,
        moves: [
          {
            taskId: 'task-2',
            taskTitle: 'CS401 Midterm Exam Preparation',
            fromBucket: 'next',
            toBucket: 'now'
          },
          {
            taskId: 'task-1',
            taskTitle: 'Revise Homepage Hero Section for Client',
            fromBucket: 'now',
            toBucket: 'next'
          }
        ],
        tradeOffs: [
          'Client revision shifted to 2:30 PM (after client call).',
          'Warning: Client requested revisions by 12:00 PM. High risk of missing deadline.',
          'Exam study will occupy your peak morning focus hours before afternoon class.'
        ],
        requiresApproval: true
      };

      assistantMsg = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'assistant',
        text: "I can re-prioritize your day so you study for tomorrow's exam first. However, pushing back the client revision means you will miss their requested 12:00 PM review window.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposal
      };
    } else {
      assistantMsg = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'assistant',
        text: `Understood. I am analyzing your workload around "${userText}". Your current priority remains focused on immediate hard deadlines.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }

    setChatMessages(prev => [...prev, userMsg, assistantMsg]);
  };

  return (
    <AppContext.Provider
      value={{
        tasks,
        calendarEvents,
        chatMessages,
        activeView,
        selectedTaskForReason,
        setActiveView,
        setSelectedTaskForReason,
        toggleTaskComplete,
        updateTaskPriority,
        applyPlanProposal,
        addMockTask,
        resetToDemoSeed,
        sendChatMessage
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

