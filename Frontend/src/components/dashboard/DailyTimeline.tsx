import React, { useState } from 'react';
import { Clock, Calendar, Sparkles, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  generateDailyTimeline,
  DAY_START_HOUR,
  TOTAL_DAY_HOURS,
  formatHour,
  TimelineBlock,
} from '../../engine/scheduler';
import { SourceLogo } from '../shared/SourceLogo';

export const DailyTimeline: React.FC = () => {
  const { tasks, calendarEvents, setSelectedTaskForReason } = useApp();
  const [hoveredBlock, setHoveredBlock] = useState<TimelineBlock | null>(null);

  // Generate continuous scheduled blocks (events + slotted tasks + open windows)
  const blocks = generateDailyTimeline(tasks, calendarEvents);

  // Simulated current time for realistic demo walkthrough: 10:15 AM
  const CURRENT_DEMO_HOUR = 10.25; // 10:15 AM
  const currentHourPercent = ((CURRENT_DEMO_HOUR - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100;

  // Hourly markers for ticks (8 AM through 10 PM)
  const hourTicks = Array.from({ length: TOTAL_DAY_HOURS + 1 }, (_, i) => DAY_START_HOUR + i);

  // Calculate stats
  const focusBlocksCount = blocks.filter((b) => b.type === 'focus').length;
  const eventBlocksCount = blocks.filter((b) => b.type === 'event').length;
  const totalOpenHours = blocks
    .filter((b) => b.type === 'open')
    .reduce((acc, b) => acc + b.durationHours, 0);

  return (
    <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700/80 transition-all duration-200 rounded-none p-5 shadow-lg">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-violet-950/50 border border-violet-700/40 text-violet-300">
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Interactive Daily Timeline</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700">
                8:00 AM – 10:00 PM
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-violet-950/60 text-violet-300 border border-violet-800/50">
                <Sparkles className="w-3 h-3 text-violet-400" />
                AI Auto-Allocated
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Fixed calendar commitments blocked out • Urgent focus blocks slotted into open intervals without overlap.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-violet-600/80 border border-violet-400/80"></span>
            <span className="text-zinc-300">AI Focus Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-zinc-800 border border-zinc-600"></span>
            <span className="text-zinc-300">Fixed Calendar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-zinc-900 border border-dashed border-zinc-700"></span>
            <span className="text-zinc-500">Open Time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-rose-400">Now (10:15 AM)</span>
          </div>
        </div>
      </div>

      {/* Timeline Visual Canvas */}
      <div className="relative w-full bg-[#0a0a0c] border border-zinc-800/90 p-4 select-none overflow-x-auto">
        <div className="min-w-[760px] relative">
          {/* Hour Tick Markers */}
          <div className="relative h-6 w-full border-b border-zinc-800 mb-2">
            {hourTicks.map((hour) => {
              const leftPercent = ((hour - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100;
              const isMajor = hour === 8 || hour === 12 || hour === 17 || hour === 22;
              return (
                <div
                  key={`tick-${hour}`}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${leftPercent}%` }}
                >
                  <span
                    className={`text-[10px] font-mono leading-none ${
                      isMajor ? 'text-zinc-200 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {formatHour(hour).replace(':00', '')}
                  </span>
                  <div
                    className={`w-[1px] mt-1 ${
                      isMajor ? 'h-2 bg-zinc-500' : 'h-1.5 bg-zinc-700'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Timeline Blocks Track */}
          <div className="relative h-28 w-full bg-[#0e0e12] border border-zinc-800/80 overflow-hidden group/track">
            {/* Hour Vertical Grid Lines */}
            {hourTicks.map((hour) => {
              const leftPercent = ((hour - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100;
              return (
                <div
                  key={`grid-${hour}`}
                  className="absolute top-0 bottom-0 w-[1px] bg-zinc-800/40 pointer-events-none"
                  style={{ left: `${leftPercent}%` }}
                />
              );
            })}

            {/* Render Scheduled Blocks */}
            {blocks.map((block) => {
              const leftPercent = ((block.startHour - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100;
              const widthPercent = (block.durationHours / TOTAL_DAY_HOURS) * 100;

              if (block.type === 'event') {
                return (
                  <div
                    key={block.id}
                    onMouseEnter={() => setHoveredBlock(block)}
                    onMouseLeave={() => setHoveredBlock(null)}
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    className="absolute top-1 bottom-1 px-2.5 py-2 bg-[#18181f] border border-zinc-700/80 hover:border-zinc-500 hover:bg-[#20202a] transition-all flex flex-col justify-between overflow-hidden cursor-default shadow-sm group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-zinc-200 truncate">
                        {block.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>{block.subtitle}</span>
                      <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 text-[9px] uppercase border border-zinc-700">
                        Fixed
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
                    onMouseEnter={() => setHoveredBlock(block)}
                    onMouseLeave={() => setHoveredBlock(null)}
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    className="absolute top-1 bottom-1 px-2.5 py-2 bg-gradient-to-br from-violet-950/70 to-indigo-950/60 border border-violet-500/60 hover:border-violet-300 hover:from-violet-900/80 hover:to-indigo-900/70 hover:shadow-lg hover:shadow-violet-950/50 transition-all flex flex-col justify-between overflow-hidden cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {task && <SourceLogo source={task.source} size={14} className="shrink-0" />}
                      <span className="text-[11px] font-semibold text-violet-100 group-hover:text-white truncate">
                        {block.title}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-violet-300">
                      <span className="truncate">
                        {formatHour(block.startHour)} – {formatHour(block.endHour)}
                      </span>
                      <span className="px-1.5 py-0.2 bg-violet-900/80 text-violet-200 text-[9px] uppercase border border-violet-700/60 shrink-0">
                        {block.durationHours}h Focus
                      </span>
                    </div>
                  </div>
                );
              }

              // Open interval block
              return (
                <div
                  key={block.id}
                  onMouseEnter={() => setHoveredBlock(block)}
                  onMouseLeave={() => setHoveredBlock(null)}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  className="absolute top-1 bottom-1 px-2 py-2 bg-zinc-950/30 border border-dashed border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-900/40 transition-colors flex flex-col justify-center items-center text-center overflow-hidden"
                >
                  <span className="text-[10px] font-mono text-zinc-500 truncate">
                    {block.durationHours >= 1.0 ? `Open Window (${block.durationHours}h)` : `${block.durationHours}h`}
                  </span>
                </div>
              );
            })}

            {/* Current Time Indicator Marker (10:15 AM) */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.9)]"
              style={{ left: `${currentHourPercent}%` }}
            >
              <div className="absolute -top-1 -translate-x-1/2 px-1.5 py-0.5 bg-rose-600 text-white font-mono text-[9px] font-bold shadow-md uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                NOW 10:15 AM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Inspector / Context Strip */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          {hoveredBlock ? (
            <div className="flex items-center gap-2 text-zinc-200">
              <span className="font-mono text-violet-400 font-semibold">
                {formatHour(hoveredBlock.startHour)} – {formatHour(hoveredBlock.endHour)} ({hoveredBlock.durationHours}h):
              </span>
              <span className="font-medium text-white">{hoveredBlock.title}</span>
              {hoveredBlock.type === 'focus' && (
                <span className="text-[11px] font-mono text-zinc-500">(Click to view AI reasoning)</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-500">Summary:</span>
              <span className="text-zinc-300">
                {eventBlocksCount} fixed commitments • {focusBlocksCount} focus sessions allocated • {totalOpenHours.toFixed(1)}h open time
              </span>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 self-end sm:self-auto">
          <span>Click any focus block to view priority rationale</span>
          <ChevronRight className="w-3 h-3 text-zinc-500" />
        </div>
      </div>
    </div>
  );
};

export default DailyTimeline;
