import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Clock, Calendar, ShieldCheck, Sparkles, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { SourceLogo } from '../shared/SourceLogo';
import axisLogo from '../../assets/logo.png';
import type { SourceType, Task } from '../../types';

interface AppThemeConfig {
  label: string;
  buttonLabel: string;
  buttonClass: string;
  defaultUrl: string;
}

const APP_THEMES: Record<SourceType, AppThemeConfig> = {
  canvas: {
    label: 'CANVAS PORTAL',
    buttonLabel: 'Go to Canvas',
    buttonClass: 'bg-[#e23838] hover:bg-[#cf2d2d] active:bg-[#b82424] text-white shadow-lg shadow-red-950/25',
    defaultUrl: 'https://canvas.instructure.com',
  },
  email: {
    label: 'GMAIL INBOX',
    buttonLabel: 'Go to Gmail',
    buttonClass: 'bg-[#ea4335] hover:bg-[#d83526] active:bg-[#c22d1f] text-white shadow-lg shadow-red-950/25',
    defaultUrl: 'https://mail.google.com',
  },
  calendar: {
    label: 'GOOGLE CALENDAR',
    buttonLabel: 'Go to Google Calendar',
    buttonClass: 'bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0f4694] text-white shadow-lg shadow-blue-950/25',
    defaultUrl: 'https://calendar.google.com',
  },
  task: {
    label: 'AXIS TASKS',
    buttonLabel: 'Open in Tasks',
    buttonClass: 'bg-[#7c3aed] hover:bg-[#6d28d9] active:bg-[#5b21b6] text-white shadow-lg shadow-violet-950/25',
    defaultUrl: '#',
  },
  github: {
    label: 'GITHUB REPOSITORY',
    buttonLabel: 'Go to GitHub',
    buttonClass: 'bg-[#238636] hover:bg-[#2ea043] active:bg-[#1f732e] text-white shadow-lg shadow-emerald-950/25',
    defaultUrl: 'https://github.com',
  },
  notion: {
    label: 'NOTION WORKSPACE',
    buttonLabel: 'Go to Notion',
    buttonClass: 'bg-[#2f3437] hover:bg-[#3f4448] active:bg-[#24282a] text-white border border-[#454b4e] shadow-lg shadow-black/30',
    defaultUrl: 'https://notion.so',
  },
};

export const TaskReasonModal: React.FC = () => {
  const { selectedTaskForReason, setSelectedTaskForReason, editTask, busy } = useApp();
  const [displayedTask, setDisplayedTask] = useState<Task | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [typedReason, setTypedReason] = useState('');
  const [effortInput, setEffortInput] = useState('');
  const [animatedScores, setAnimatedScores] = useState({ deadlineProximity: 0, calendarFit: 0, consequenceWeight: 0, importanceScore: 0, priorityScore: 0 });

  useEffect(() => {
    if (selectedTaskForReason) {
      setDisplayedTask(selectedTaskForReason);
      setEffortInput(selectedTaskForReason.estimatedHours ? String(selectedTaskForReason.estimatedHours) : '');
      setIsClosing(false);
    } else if (displayedTask && !isClosing) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setDisplayedTask(null);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedTaskForReason]);

  useEffect(() => {
    if (!displayedTask) {
      setTypedReason('');
      setAnimatedScores({ deadlineProximity: 0, calendarFit: 0, consequenceWeight: 0, importanceScore: 0, priorityScore: 0 });
      return;
    }

    const task = displayedTask;
    const startedAt = performance.now();
    const duration = 750;
    const reasonText = task.reasoning || '';
    setTypedReason('');
    setAnimatedScores({ deadlineProximity: 0, calendarFit: 0, consequenceWeight: 0, importanceScore: 0, priorityScore: 0 });

    const typeTimer = window.setInterval(() => {
      const count = Math.min(reasonText.length, Math.floor((performance.now() - startedAt) / 18));
      setTypedReason(reasonText.slice(0, count));
      if (count >= reasonText.length) window.clearInterval(typeTimer);
    }, 18);

    const sb = task.scoreBreakdown || {};
    const targetDP = Number(sb.deadlineProximity ?? sb.urgency ?? 0) || 0;
    const targetCF = Number(sb.calendarFit ?? sb.waitingAge ?? 0) || 0;
    const targetCW = Number(sb.consequenceWeight ?? sb.delayImpact ?? 0) || 0;
    const targetIS = Number(sb.importanceScore ?? sb.importance ?? 0) || 0;
    const targetPS = Number(task.priorityScore ?? (targetDP + targetCF + targetCW + targetIS)) || 0;

    let frame = 0;
    const animateScores = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScores({
        deadlineProximity: Math.round(targetDP * eased),
        calendarFit: Math.round(targetCF * eased),
        consequenceWeight: Math.round(targetCW * eased),
        importanceScore: Math.round(targetIS * eased),
        priorityScore: Math.round(targetPS * eased),
      });
      if (progress < 1) frame = window.requestAnimationFrame(animateScores);
    };
    frame = window.requestAnimationFrame(animateScores);

    return () => {
      window.clearInterval(typeTimer);
      window.cancelAnimationFrame(frame);
    };
  }, [displayedTask]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setSelectedTaskForReason(null);
      setDisplayedTask(null);
      setIsClosing(false);
    }, 200);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && displayedTask && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedTask, isClosing]);

  if (!displayedTask) return null;

  const task = displayedTask;
  const theme = APP_THEMES[task.source] || APP_THEMES.task;
  const portalLabel = task.sourceLabel ? task.sourceLabel.toUpperCase() : theme.label;

  const handleSaveEffort = async (hours: number) => {
    if (!task || isNaN(hours) || hours <= 0) return;
    try {
      await editTask(task.id, task.version || 1, {
        estimatedHours: hours,
        confirmEvidence: true,
      });
    } catch {
      // Error handled by AppContext
    }
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#141518] border border-[#232328] rounded-none max-w-xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col ${
          isClosing ? 'animate-modal-exit' : 'animate-modal-enter'
        }`}
      >
        {/* Top Header: Source Logo + Portal Name on left, Close button on right */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <SourceLogo source={task.source} size={44} />
            </div>
            <span className="text-sm font-semibold tracking-wider text-zinc-400 uppercase font-sans">
              {portalLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-none text-zinc-500 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Title */}
        <h2 className="text-lg sm:text-xl font-normal text-white tracking-tight mt-1 mb-3">
          {task.title}
        </h2>

        {/* Main Inner Card - Clean straight borders (no rounded borders) */}
        <div className="border border-[#232328] bg-[#141417]/90 rounded-none p-5 sm:p-6 mb-4 space-y-5">
          {/* Top row inside card: Axis Logo anchored at Top Left & Priority Score at Top Right */}
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 -mt-1 -ml-1">
              <img
                src={axisLogo}
                alt="Axis"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>
            <div className="flex items-baseline gap-2 font-sans pt-1">
              <span className="text-xs sm:text-sm font-normal tracking-wide text-zinc-400 uppercase">
                PRIORITY SCORE:
              </span>
              <span className="text-2xl sm:text-3xl font-medium text-[#a855f7] tabular-nums">
                {animatedScores.priorityScore || 0}
              </span>
              <span className="text-sm font-normal text-zinc-400">/ 100</span>
            </div>
          </div>

          {/* AI reasoning explanation context */}
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal min-h-[2.5rem]" aria-live="polite">
            {typedReason}
          </p>

          {/* Factor Weight Breakdown Section */}
          <div>
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-zinc-500 uppercase font-sans mb-3.5">
              FACTOR WEIGHT BREAKDOWN
            </div>

            {/* Factor Breakdown List */}
            <div className="pl-3 sm:pl-4 space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-zinc-200 font-normal">
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Deadline Proximity</span>
                </div>
                <div className="font-sans">
                  <span className="font-bold text-white">
                    {animatedScores.deadlineProximity || 0}
                  </span>
                  <span className="text-zinc-400 ml-1 font-normal text-sm">/ 40</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-zinc-200 font-normal">
                  <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Calendar Slot Fit</span>
                </div>
                <div className="font-sans">
                  <span className="font-bold text-white">
                    {animatedScores.calendarFit || 0}
                  </span>
                  <span className="text-zinc-400 ml-1 font-normal text-sm">/ 20</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-zinc-200 font-normal">
                  <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Consequence</span>
                </div>
                <div className="font-sans">
                  <span className="font-bold text-white">
                    {animatedScores.consequenceWeight || 0}
                  </span>
                  <span className="text-zinc-400 ml-1 font-normal text-sm">/ 25</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-zinc-200 font-normal">
                  <Sparkles className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Importance</span>
                </div>
                <div className="font-sans">
                  <span className="font-bold text-white">
                    {animatedScores.importanceScore || 0}
                  </span>
                  <span className="text-zinc-400 ml-1 font-normal text-sm">/ 15</span>
                </div>
              </div>
            </div>
          </div>

          {/* Effort Calibration Input (when unknown or user wants to adjust) */}
          <div className="p-3 bg-[#18181c] border border-[#2a2a30] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300 uppercase tracking-wider font-mono text-[11px]">
                Estimated Effort Calibration
              </span>
              <span className="text-zinc-400 font-mono">
                {task.estimatedHours === null ? 'Effort Unknown' : `${task.estimatedHours}h allocated`}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {task.estimatedHours === null
                ? 'The priority engine cannot calculate calendar slack without an effort estimate. Provide an estimate to recalculate score:'
                : 'Recalibrate this task duration to re-score deadline slack:'}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[1, 2, 3].map((h) => (
                <button
                  key={h}
                  type="button"
                  disabled={busy}
                  onClick={() => handleSaveEffort(h)}
                  className="px-2.5 py-1 bg-[#232328] hover:bg-violet-900/40 hover:border-violet-700/60 border border-zinc-700 text-xs text-zinc-200 font-mono transition-colors"
                >
                  +{h}h
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="24"
                  placeholder="Hours"
                  value={effortInput}
                  onChange={(e) => setEffortInput(e.target.value)}
                  className="w-20 px-2 py-1 bg-[#121215] border border-zinc-700 text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={busy || !effortInput}
                  onClick={() => handleSaveEffort(Number(effortInput))}
                  className="px-3 py-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{busy ? 'Scoring…' : 'Score Task'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Warning / Consequence of Delay */}
          {task.consequencesOfDelay && (
            <div className="pt-1 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-[#f87171] shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-[#f87171] leading-relaxed font-normal">
                {task.consequencesOfDelay}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons: Close Explanation + App-Themed Redirect Button */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-3 px-4 bg-[#25262b] hover:bg-[#2b2d35] active:bg-[#1a1b1f] text-white text-sm font-semibold rounded-none transition-all duration-150"
          >
            Close Explanation
          </button>

          <a
            href={theme.defaultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-3 px-4 ${theme.buttonClass} text-sm font-medium rounded-none transition-all duration-150 flex items-center justify-center gap-2`}
          >
            <span>{theme.buttonLabel}</span>
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default TaskReasonModal;
