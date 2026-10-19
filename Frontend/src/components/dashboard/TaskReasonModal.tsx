import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Clock, Calendar, ShieldCheck, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';
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
  const { selectedTaskForReason, setSelectedTaskForReason } = useApp();
  const [displayedTask, setDisplayedTask] = useState<Task | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [typedReason, setTypedReason] = useState('');
  const [animatedScores, setAnimatedScores] = useState({ deadlineProximity: 0, calendarFit: 0, consequenceWeight: 0, importanceScore: 0, priorityScore: 0 });

  useEffect(() => {
    if (selectedTaskForReason) {
      setDisplayedTask(selectedTaskForReason);
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
    setTypedReason('');
    setAnimatedScores({ deadlineProximity: 0, calendarFit: 0, consequenceWeight: 0, importanceScore: 0, priorityScore: 0 });

    const typeTimer = window.setInterval(() => {
      const count = Math.min(task.reasoning.length, Math.floor((performance.now() - startedAt) / 18));
      setTypedReason(task.reasoning.slice(0, count));
      if (count >= task.reasoning.length) window.clearInterval(typeTimer);
    }, 18);

    let frame = 0;
    const animateScores = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScores({
        deadlineProximity: Math.round(task.scoreBreakdown.deadlineProximity * eased),
        calendarFit: Math.round(task.scoreBreakdown.calendarFit * eased),
        consequenceWeight: Math.round(task.scoreBreakdown.consequenceWeight * eased),
        importanceScore: Math.round(task.scoreBreakdown.importanceScore * eased),
        priorityScore: Math.round(task.priorityScore * eased),
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
        <div className="border border-[#232328] bg-[#141417]/90 rounded-none p-5 sm:p-6 mb-4">
          {/* Top row inside card: Bigger Axis Logo anchored at Top Left & Priority Score at Top Right */}
          <div className="flex items-start justify-between mb-5">
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
                {animatedScores.priorityScore}
              </span>
              <span className="text-sm font-normal text-zinc-400">/ 100</span>
            </div>
          </div>

          {/* Context content indented relative to the top-left Axis logo to establish hierarchy */}
          <div className="space-y-5">
            {/* AI reasoning explanation context */}
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal min-h-[2.5rem]" aria-live="polite">
              {typedReason}
            </p>

            {/* Factor Weight Breakdown Section */}
            <div>
              <div className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-zinc-500 uppercase font-sans mb-3.5">
                FACTOR WEIGHT BREAKDOWN
              </div>

              {/* Factor Breakdown List - Indented further under header */}
              <div className="pl-3 sm:pl-4 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-zinc-200 font-normal">
                    <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Deadline Proximity</span>
                  </div>
                  <div className="font-sans">
                    <span className="font-bold text-white">
                      {animatedScores.deadlineProximity}
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
                      {animatedScores.calendarFit}
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
                      {animatedScores.consequenceWeight}
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
                      {animatedScores.importanceScore}
                    </span>
                    <span className="text-zinc-400 ml-1 font-normal text-sm">/ 15</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning / Consequence of Delay - Indented matching sub-hierarchy */}
            {task.consequencesOfDelay && (
              <div className="pt-1 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-[#f87171] shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-[#f87171] leading-relaxed font-normal">
                  {task.consequencesOfDelay}
                </p>
              </div>
            )}
          </div>
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
