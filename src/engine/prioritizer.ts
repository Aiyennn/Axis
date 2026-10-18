import { Task, PriorityBucket } from '../types';

export interface ScoreCalculationResult {
  score: number;
  bucket: PriorityBucket;
  breakdown: {
    deadlineProximity: number;
    consequenceWeight: number;
    calendarFit: number;
    importanceScore: number;
  };
  reasoning: string;
  consequencesOfDelay: string;
}

/**
 * Calculates a dynamic 0-100 priority score based on multi-factor constraints.
 */
export function calculatePriorityScore(
  task: Pick<Task, 'title' | 'deadline' | 'isHardDeadline' | 'estimatedHours' | 'importance' | 'source'>,
  availableFreeHoursToday: number = 4.5
): ScoreCalculationResult {
  const lowerTitle = task.title.toLowerCase();
  const lowerDeadline = task.deadline.toLowerCase();

  // 1. Deadline Proximity (0 - 40 pts)
  let deadlineProximity = 10;
  if (lowerDeadline.includes('12:00') || lowerDeadline.includes('noon') || lowerDeadline.includes('soon') || lowerDeadline.includes('3.5h')) {
    deadlineProximity = 38;
  } else if (lowerDeadline.includes('today') || lowerDeadline.includes('5:00')) {
    deadlineProximity = 30;
  } else if (lowerDeadline.includes('tomorrow')) {
    deadlineProximity = 28;
  } else if (lowerDeadline.includes('thursday')) {
    deadlineProximity = 14;
  } else if (lowerDeadline.includes('friday')) {
    deadlineProximity = 10;
  }

  // 2. Commitment Consequence (0 - 25 pts)
  let consequenceWeight = 10;
  if (task.isHardDeadline) {
    consequenceWeight = 25;
  } else if (task.importance === 'high') {
    consequenceWeight = 20;
  } else if (task.importance === 'medium') {
    consequenceWeight = 15;
  } else {
    consequenceWeight = 8;
  }

  // 3. Calendar Slot Fit (0 - 20 pts)
  let calendarFit = 12;
  if (task.estimatedHours <= 1.0) {
    calendarFit = 18; // easily fits short gaps
  } else if (task.estimatedHours <= availableFreeHoursToday) {
    calendarFit = 16;
  } else {
    calendarFit = 8; // exceeds continuous free block
  }

  // 4. Importance Base Weight (0 - 15 pts)
  let importanceScore = 5;
  if (task.importance === 'high') {
    importanceScore = 15;
  } else if (task.importance === 'medium') {
    importanceScore = 10;
  } else {
    importanceScore = 5;
  }

  // Total Score (Clamped 0 - 100)
  const totalScore = Math.min(100, Math.max(0, deadlineProximity + consequenceWeight + calendarFit + importanceScore));

  // Determine Priority Bucket Thresholds
  let bucket: PriorityBucket = 'later';
  if (totalScore >= 80) {
    bucket = 'now';
  } else if (totalScore >= 50) {
    bucket = 'next';
  } else {
    bucket = 'later';
  }

  // Generate explainable reasoning strings (AI Definition of the task)
  let reasoning = '';
  let consequencesOfDelay = '';

  if (task.isHardDeadline && lowerDeadline.includes('today')) {
    reasoning = `This task is extremely urgent, with only 3.5 hours remaining before the deadline. It is a critical priority because the client cannot approve or finalize the invoice until this task is completed. Delays may directly impact the billing process.`;
    consequencesOfDelay = 'Misses client review window; postpones milestone payout and damages client trust.';
  } else if (lowerTitle.includes('exam') || lowerTitle.includes('midterm')) {
    reasoning = `High-stakes university midterm exam scheduled for tomorrow morning. Axis recommends an uninterrupted multi-hour study session right now to consolidate core concepts and avoid cognitive panic tonight.`;
    consequencesOfDelay = 'Insufficient review time before the exam, resulting in lower test performance.';
  } else if (task.estimatedHours <= 1.0) {
    reasoning = `This is a quick, high-leverage turnaround task requiring approximately ${task.estimatedHours}h. Completing it now prevents small administrative backlogs from compounding into later workflow friction.`;
    consequencesOfDelay = 'Delayed payment processing cycle or administrative bottleneck.';
  } else {
    reasoning = `This assignment has a flexible timeline with low immediate urgency. Axis determined it can be safely deferred without compromising critical client commitments or grade milestones today.`;
    consequencesOfDelay = 'Minimal immediate consequence; safe to progress over the upcoming days.';
  }

  return {
    score: totalScore,
    bucket,
    breakdown: {
      deadlineProximity,
      consequenceWeight,
      calendarFit,
      importanceScore
    },
    reasoning,
    consequencesOfDelay
  };
}

