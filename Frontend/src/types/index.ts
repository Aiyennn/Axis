export type SourceType = 'email' | 'canvas' | 'calendar' | 'task' | 'notion' | 'github';
export type PriorityBucket = 'now' | 'next' | 'later';
export type ImportanceLevel = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  version?: number;
  rank?: number;
  explanationSource?: 'ai' | 'rules';
  explanationStatus?: string;
  requiresReview?: boolean;
  evidence?: { field: string; origin: string; quote?: string; needsConfirmation?: boolean }[];
  warnings?: string[];
  plannedWork?: { start: string; end: string }[];
  title: string;
  description: string;
  source: SourceType;
  sourceLabel: string;
  deadline: string;
  isHardDeadline: boolean | null;
  estimatedHours: number | null;
  importance: ImportanceLevel | null;
  status: 'pending' | 'completed';
  priorityScore: number; // 0 - 100
  priorityBucket: PriorityBucket;
  scoreBreakdown: Record<string, number>;
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
  runId?: string;
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

