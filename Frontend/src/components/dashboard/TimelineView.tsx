import React from 'react';
import { Calendar, Clock, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DailyTimeline } from './DailyTimeline';
import { generateDailyTimeline, formatHour, TOTAL_DAY_HOURS } from '../../engine/scheduler';
import { SourceLogo } from '../shared/SourceLogo';
import { UpcomingSchedule } from './UpcomingSchedule';

export const TimelineView: React.FC = () => {
  const { tasks, calendarEvents, capacity, setSelectedTaskForReason, setActiveView } = useApp();


  const blocks = generateDailyTimeline(tasks, calendarEvents);

  const focusBlocks = blocks.filter((b) => b.type === 'focus');
  const eventBlocks = blocks.filter((b) => b.type === 'event');

  return (
    <div className="space-y-6 animate-slide-left">
      <header className="schedule-header">
        <div className="schedule-heading">
          <p className="schedule-date">Tuesday, Oct 20, 2026 <span>·</span> Mock clock</p>
          <h1>Timeline &amp; Daily Schedule</h1>
          <p className="schedule-description">
            Proposed work blocks within the 9:00 AM–6:00 PM workday, calculated by the deterministic engine around stored calendar events.
          </p>
        </div>
        <div className="schedule-metrics" aria-label="Schedule overview">
          <div className="schedule-metric">
            <span>Window</span>
            <strong>{TOTAL_DAY_HOURS.toFixed(1)}h</strong>
          </div>
          <div className="schedule-metric">
            <span>Fixed events</span>
            <strong>{eventBlocks.length} <small>({eventBlocks.reduce((total, block) => total + block.durationHours, 0)}h)</small></strong>
          </div>
          <div className="schedule-metric schedule-metric-focus">
            <span>Focus slots</span>
            <strong>{focusBlocks.length} Sessions</strong>
          </div>
          <div className={`schedule-metric ${capacity.isOverloaded ? 'schedule-metric-overload' : 'schedule-metric-capacity'}`}>
            <span>{capacity.isOverloaded ? 'Overload' : 'Capacity'}</span>
            <strong>{capacity.isOverloaded ? `+${capacity.deficitHours}h Deficit` : `${capacity.availableFreeHours}h Free`}</strong>
          </div>
        </div>
      </header>

      <DailyTimeline />

      {/* Two-Column Deep-Dive Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chronological Agenda Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-[#121215] border border-[#27272a] p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Chronological Run of Day</h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {blocks.length} Total Segments
            </span>
          </div>

          <ol className="pt-1">
            {blocks.map((block, index) => (
              <li key={block.id} className="relative flex gap-4 pb-7 last:pb-0">
                {index < blocks.length - 1 && (
                  <span aria-hidden="true" className="absolute left-3 top-6 bottom-0 w-px bg-zinc-800" />
                )}
                <span aria-hidden="true" className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-[#121215]">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-zinc-400 mb-2">
                    {formatHour(block.startHour)} – {formatHour(block.endHour)}
                  </p>
                  {block.type === 'focus' && block.task ? (
                    <button
                      type="button"
                      onClick={() => block.task && setSelectedTaskForReason(block.task)}
                      className="flex items-center gap-3.5 text-left text-base font-semibold leading-snug text-zinc-100 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
                    >
                      <SourceLogo source={block.task.source} size={32} className="shrink-0" />
                      <span>{block.title}</span>
                    </button>
                  ) : (
                    <div className={`flex items-center gap-3.5 text-base font-semibold leading-snug ${block.type === 'open' ? 'text-zinc-500' : 'text-zinc-100'}`}>
                      {block.type === 'event' ? (
                        <SourceLogo source="calendar" size={32} className="shrink-0" />
                      ) : (
                        <Clock size={32} strokeWidth={1.5} className="shrink-0" />
                      )}
                      <span>{block.type === 'open' ? 'Open Focus Window' : block.title}</span>
                    </div>
                  )}
                  {block.type === 'focus' && block.task?.reasoning && (
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:pl-[46px]">
                      {block.task.reasoning}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <UpcomingSchedule />
        </div>
        {/* Right Column: Schedule Intelligence & Commitments (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Calendar Commitments Summary Card */}
          <div className="bg-[#121215] border border-[#27272a] p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Fixed Commitments (Calendar)</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Events imported from your synced calendar. The prioritization engine treats these as inviolable anchors.
            </p>

            <div className="space-y-2.5">
              {calendarEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 bg-[#18181d] border border-zinc-800 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{ev.title}</div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">{ev.displayTime}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                    {ev.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Slotting Intelligence Rules Card */}
          <div className="bg-[#121215] border border-[#27272a] p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Scheduling rules</h3>
            </div>
            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p>
                  <strong className="text-white">Deadline-aware allocation:</strong> The engine uses deadline risk, available time, and task facts to propose work blocks. Missing effort stays unscheduled.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p>
                  <strong className="text-white">Protected Class Transitions:</strong> Focus blocks are fitted into contiguous intervals between classes to avoid fragmented context switching.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p>
                  <strong className="text-white">Edit facts to recalculate:</strong> Open a task to update effort or confirm evidence. The backend saves a new revision and recalculates priorities.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => setActiveView('dashboard')}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors"
              >
                <span>Return to Focus Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;

