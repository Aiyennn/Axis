export type SourceType = 'email' | 'canvas' | 'calendar' | 'task';
export type PriorityBucket = 'now' | 'next' | 'later';
export type ImportanceLevel = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  source: SourceType;
  sourceLabel: string;
  deadline: string;
  isHardDeadline: boolean;
  estimatedHours: number;
  importance: ImportanceLevel;
  status: 'pending' | 'completed';
  priorityScore: number; // 0 - 100
  priorityBucket: PriorityBucket;
  scoreBreakdown: {
    deadlineProximity: number; // 0 - 40
    consequenceWeight: number; // 0 - 25
    calendarFit: number; // 0 - 20
    importanceScore: number; // 0 - 15
  };
  reasoning: string;
  consequencesOfDelay: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startHour: number; // e.g. 9.5 for 9:30 AM
  endHour: number; // e.g. 11.0 for 11:00 AM
  displayTime: string;
  type: 'class' | 'meeting' | 'busy';
}

export interface PlanChangeProposal {
  id: string;
  requestedPrompt: string;
  moves: Array<{
    taskId: string;
    taskTitle: string;
    fromBucket: PriorityBucket;
    toBucket: PriorityBucket;
  }>;
  tradeOffs: string[];
  requiresApproval: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  proposal?: PlanChangeProposal;
}

