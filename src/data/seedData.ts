import { Task, CalendarEvent, ChatMessage } from '../types';

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Revise Homepage Hero Section for Client',
    description: 'Client sent feedback requesting new copy and responsive mobile adjustments before final invoice approval.',
    source: 'email',
    sourceLabel: 'Client Email',
    deadline: 'Today, 12:00 PM',
    isHardDeadline: true,
    estimatedHours: 2.0,
    importance: 'high',
    status: 'pending',
    priorityScore: 98,
    priorityBucket: 'now',
    scoreBreakdown: {
      deadlineProximity: 38,
      consequenceWeight: 25,
      calendarFit: 20,
      importanceScore: 15
    },
    reasoning: 'Critical hard deadline in 3.5 hours. Directly blocks client invoice sign-off.',
    consequencesOfDelay: 'Misses client review window; postpones milestone payout.'
  },
  {
    id: 'task-2',
    title: 'CS401 Midterm Exam Preparation',
    description: 'Review chapters 4 through 7 on distributed algorithms and concurrency patterns.',
    source: 'canvas',
    sourceLabel: 'Canvas Portal',
    deadline: 'Tomorrow, 9:00 AM',
    isHardDeadline: true,
    estimatedHours: 3.0,
    importance: 'high',
    status: 'pending',
    priorityScore: 84,
    priorityBucket: 'next',
    scoreBreakdown: {
      deadlineProximity: 28,
      consequenceWeight: 25,
      calendarFit: 16,
      importanceScore: 15
    },
    reasoning: 'High-stake university exam. Best scheduled in afternoon after classes.',
    consequencesOfDelay: 'Insufficient review time before morning exam.'
  },
  {
    id: 'task-3',
    title: 'Submit Freelance Timesheet & Invoices',
    description: 'Log weekly hours worked across client projects and send billing summary.',
    source: 'task',
    sourceLabel: 'Task Tracker',
    deadline: 'Today, 5:00 PM',
    isHardDeadline: false,
    estimatedHours: 0.5,
    importance: 'medium',
    status: 'pending',
    priorityScore: 76,
    priorityBucket: 'next',
    scoreBreakdown: {
      deadlineProximity: 30,
      consequenceWeight: 18,
      calendarFit: 18,
      importanceScore: 10
    },
    reasoning: 'Quick turnaround task (30m) that fits into late afternoon gap.',
    consequencesOfDelay: 'Delayed payment processing cycle.'
  },
  {
    id: 'task-4',
    title: 'Draft Literature Review Outline',
    description: 'Structure bibliography and initial three headings for technical writing term paper.',
    source: 'canvas',
    sourceLabel: 'Canvas Portal',
    deadline: 'Friday, 11:59 PM',
    isHardDeadline: false,
    estimatedHours: 1.5,
    importance: 'medium',
    status: 'pending',
    priorityScore: 42,
    priorityBucket: 'later',
    scoreBreakdown: {
      deadlineProximity: 10,
      consequenceWeight: 14,
      calendarFit: 8,
      importanceScore: 10
    },
    reasoning: 'Flexible deadline in 4 days. Safe to postpone during exam week crunch.',
    consequencesOfDelay: 'None immediately; due later this week.'
  },
  {
    id: 'task-5',
    title: 'Pick Up Lab Course Materials',
    description: 'Visit campus bookstore before 6 PM to collect physical kit.',
    source: 'task',
    sourceLabel: 'Personal Task',
    deadline: 'Thursday, 6:00 PM',
    isHardDeadline: false,
    estimatedHours: 0.5,
    importance: 'low',
    status: 'pending',
    priorityScore: 35,
    priorityBucket: 'later',
    scoreBreakdown: {
      deadlineProximity: 12,
      consequenceWeight: 8,
      calendarFit: 10,
      importanceScore: 5
    },
    reasoning: 'Low urgency personal errand. Can be grouped with tomorrow campus trip.',
    consequencesOfDelay: 'None; can be collected tomorrow.'
  }
];

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'cal-1',
    title: 'CS401 Distributed Systems Lecture',
    startHour: 9.5, // 9:30 AM
    endHour: 11.0,  // 11:00 AM
    displayTime: '9:30 AM – 11:00 AM',
    type: 'class'
  },
  {
    id: 'cal-2',
    title: 'Client Standup Call',
    startHour: 14.0, // 2:00 PM
    endHour: 14.5,  // 2:30 PM
    displayTime: '2:00 PM – 2:30 PM',
    type: 'meeting'
  }
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'assistant',
    text: "Good morning! I've unified your inbox, Canvas portal, and calendar. You have 6.0 hours of urgent work with only 4.5 hours of free calendar time today. I recommend focusing on the Client Hero Revision first due to its hard noon deadline.",
    timestamp: '8:05 AM'
  }
];

