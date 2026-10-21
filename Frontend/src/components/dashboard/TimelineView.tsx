import React from 'react';
import { Calendar, Clock, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, BookOpen, Video } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DailyTimeline } from './DailyTimeline';
import { generateDailyTimeline, formatHour } from '../../engine/scheduler';
import { SourceLogo } from '../shared/SourceLogo';

export const TimelineView: React.FC = () => {
  const { tasks, calendarEvents, capacity, setSelectedTaskForReason, setActiveView } = useApp();


  const blocks = generateDailyTimeline(tasks, calendarEvents);

  const focusBlocks = blocks.filter((b) => b.type === 'focus');
  const eventBlocks = blocks.filter((b) => b.type === 'event');

  return (
    <div className="space-y-6 animate-slide-left">
      {/* Top Header & Overview */}
      <div className="bg-[#121215] border border-[#27272a] p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-violet-950 text-violet-300 border border-violet-800">
                Schedule Engine
              </span>
              <span className="text-xs font-mono text-zinc-500">Tuesday, Oct 20, 2026 · Mock clock</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1 tracking-tight">Timeline & Daily Schedule</h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Proposed work blocks within the 9:00 AM–6:00 PM workday, calculated by the deterministic engine around stored calendar events.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
            <div className="px-3 py-2 bg-[#18181d] border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase">Window</div>
              <div className="text-sm font-semibold text-white">14.0h</div>
            </div>
            <div className="px-3 py-2 bg-[#18181d] border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase">Fixed Events</div>
              <div className="text-sm font-semibold text-zinc-200">{eventBlocks.length} ({calendarEvents.reduce((acc, ev) => acc + (ev.endHour - ev.startHour), 0)}h)</div>
            </div>
            <div className="px-3 py-2 bg-[#18181d] border border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase">Focus Slots</div>
              <div className="text-sm font-semibold text-violet-300">{focusBlocks.length} Sessions</div>
            </div>
            <div className={`px-3 py-2 border ${
              capacity.isOverloaded
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
            }`}>
              <div className="text-[10px] uppercase">{capacity.isOverloaded ? 'Overload' : 'Capacity'}</div>
              <div className="text-sm font-semibold">
                {capacity.isOverloaded ? `+${capacity.deficitHours}h Deficit` : `${capacity.availableFreeHours}h Free`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Daily Timeline Bar */}
      <div>
        <DailyTimeline />
      </div>

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

          <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-zinc-800/70">
            {blocks.map((block) => {
              if (block.type === 'event') {
                const isLecture = block.event?.type === 'class';
                return (
                  <div
                    key={block.id}
                    className="relative pl-8 pr-3 py-2.5 bg-[#18181f] border border-zinc-700/80 hover:border-zinc-500 transition-all group"
                  >
                    <div className="absolute left-[9px] top-4 w-2 h-2 rounded-none bg-zinc-400 ring-4 ring-[#121215]"></div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-zinc-300">
                            {formatHour(block.startHour)} – {formatHour(block.endHour)}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                            Fixed Commitment
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white mt-1 flex items-center gap-1.5">
                          {isLecture ? (
                            <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          ) : (
                            <Video className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          )}
                          <span>{block.title}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {block.subtitle || 'Scheduled on Google / Apple Calendar'}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-zinc-500 shrink-0">
                        {block.durationHours}h
                      </span>
                    </div>
                  </div>
                );
              }

              if (block.type === 'focus') {
                const task = block.task;
                return (
                  <div
                    key={block.id}
                    onClick={() => task && setSelectedTaskForReason(task)}
                    className="relative pl-8 pr-3 py-2.5 bg-gradient-to-r from-violet-950/40 to-transparent border border-violet-800/50 hover:border-violet-500 hover:bg-violet-950/60 transition-all cursor-pointer group"
                  >
                    <div className="absolute left-[9px] top-4 w-2 h-2 rounded-none bg-violet-400 ring-4 ring-[#121215] group-hover:scale-125 transition-transform"></div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-violet-300">
                            {formatHour(block.startHour)} – {formatHour(block.endHour)}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-violet-900/60 text-violet-200 border border-violet-700/60 uppercase">
                            Proposed Focus Slot
                          </span>
                          {task?.isHardDeadline && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-rose-950/60 text-rose-300 border border-rose-800/60">
                              Hard Deadline
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-white group-hover:text-violet-100 mt-1 flex items-center gap-2">
                          {task && <SourceLogo source={task.source} size={15} />}
                          <span>{block.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                          <span>Source: {task?.sourceLabel}</span>
                          <span>•</span>
                          <span className="text-violet-400">Score: {task?.priorityScore}/100</span>
                          <span>•</span>
                          <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                            Click to view explanation →
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-violet-400 font-semibold shrink-0">
                        {block.durationHours}h
                      </span>
                    </div>
                  </div>
                );
              }

              // Open interval
              return (
                <div
                  key={block.id}
                  className="relative pl-8 pr-3 py-2 bg-zinc-900/20 border border-dashed border-zinc-800/60 text-zinc-500"
                >
                  <div className="absolute left-[10px] top-3.5 w-1.5 h-1.5 rounded-none bg-zinc-700 ring-4 ring-[#121215]"></div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span>
                      {formatHour(block.startHour)} – {formatHour(block.endHour)} • Open Focus Window
                    </span>
                    <span>{block.durationHours}h Free</span>
                  </div>
                </div>
              );
            })}
          </div>
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

