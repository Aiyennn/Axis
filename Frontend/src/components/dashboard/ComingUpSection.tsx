import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { SourceLogo } from '../shared/SourceLogo';
import { Task } from '../../types';
import { currentFocusTask, firstPlannedStart, plannedLabel, scheduleDayLabel } from '../../engine/scheduleDisplay';

// Helper to format time & duration like '9:00 AM - 3 Hours' or '5:00 PM - 0.5 Hours'
function formatTaskSubtitle(task: Task, now: string): string {
  const timeStr = task.deadline;

  const durationStr = task.estimatedHours === null ? "Estimate needed" : `${task.estimatedHours} hours`;
  return `${task.priorityBucket.toUpperCase()} · Planned ${plannedLabel(task, now)} · Due ${timeStr} · ${durationStr}`;
}

export const ComingUpSection: React.FC = () => {
  const { tasks, mockNow, setSelectedTaskForReason } = useApp();
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter tasks belonging to "next" priority bucket that are pending
  const focusId = currentFocusTask(tasks)?.id;
  const comingUpTasks = tasks.filter(t => t.id !== focusId && t.priorityBucket !== 'later' && t.status === 'pending');

  // Group by allocated work, since a deadline is not the planned study time.
  const todayTasks = comingUpTasks.filter(t => {
    const start = firstPlannedStart(t);
    return start && scheduleDayLabel(start, mockNow) === 'Today';
  });

  const tomorrowTasks = comingUpTasks.filter(t => {
    const start = firstPlannedStart(t);
    return start && scheduleDayLabel(start, mockNow) === 'Tomorrow';
  });

  const otherTasks = comingUpTasks.filter(t => !todayTasks.includes(t) && !tomorrowTasks.includes(t));

  // Get unique sources actually present in comingUpTasks
  const uniqueSources = Array.from(new Set(comingUpTasks.map(t => t.source)));

  return (
    <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700/80 transition-all duration-200 rounded-none p-7 shadow-xl shadow-black/40">
      {/* Header row: overlapping logos + 'COMING UP' on left, 'X tasks' and toggle chevron on right */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none group/header"
      >
        <div className="flex items-center gap-3">
          {/* Overlapping integration logos dynamically based on content */}
          {uniqueSources.length > 0 && (
            <div className="flex items-center -space-x-2">
              {uniqueSources.map((source, index) => (
                <div
                  key={source}
                  style={{ zIndex: 10 + index }}
                  className="relative w-8 h-8 rounded-full bg-[#1c1c21] p-0.5 border border-zinc-800 flex items-center justify-center shadow-md group-hover/header:border-zinc-700 group-hover/header:scale-105 transition-all"
                >
                  <SourceLogo source={source} size={20} />
                </div>
              ))}
            </div>
          )}

          <h3 className="text-base font-bold text-white tracking-wider uppercase group-hover/header:text-zinc-100 transition-colors">
            COMING UP
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium group-hover/header:text-zinc-300 transition-colors">
            {comingUpTasks.length} tasks
          </span>
          <button className="text-zinc-500 group-hover/header:text-zinc-200 transition-colors p-1 rounded-none group-hover/header:bg-zinc-800/40">
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ease-in-out ${
                isExpanded ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Smooth animated accordion container using CSS grid template rows */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-7' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          {comingUpTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-[#27272a] rounded-none">
              No upcoming tasks scheduled
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Today Group */}
              {todayTasks.length > 0 && (
                <div className="flex flex-col pb-5 border-b border-zinc-800/80">
                  <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                    Today
                  </span>
                  <div className="flex flex-col pl-4 gap-1">
                    {todayTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskForReason(task)}
                        className="group flex items-center justify-between p-2.5 -mx-2.5 rounded-none cursor-pointer border border-transparent hover:border-zinc-700/60 hover:bg-[#18181d] hover:shadow-lg hover:shadow-black/20 hover:translate-x-1 transition-all duration-150"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                            <SourceLogo source={task.source} size={26} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
                              {task.title}
                            </h4>
                            <p className="text-xs text-zinc-400 group-hover:text-zinc-300 mt-0.5 font-normal transition-colors">
                              {formatTaskSubtitle(task, mockNow)}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 shrink-0 ml-4 transition-all duration-150" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tomorrow Group */}
              {tomorrowTasks.length > 0 && (
                <div className="flex flex-col pt-5">
                  <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                    Tomorrow
                  </span>
                  <div className="flex flex-col pl-4 gap-1">
                    {tomorrowTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskForReason(task)}
                        className="group flex items-center justify-between p-2.5 -mx-2.5 rounded-none cursor-pointer border border-transparent hover:border-zinc-700/60 hover:bg-[#18181d] hover:shadow-lg hover:shadow-black/20 hover:translate-x-1 transition-all duration-150"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                            <SourceLogo source={task.source} size={26} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
                              {task.title}
                            </h4>
                            <p className="text-xs text-zinc-400 group-hover:text-zinc-300 mt-0.5 font-normal transition-colors">
                              {formatTaskSubtitle(task, mockNow)}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 shrink-0 ml-4 transition-all duration-150" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other/Upcoming Group (if any) */}
              {otherTasks.length > 0 && (
                <div className="flex flex-col pt-5 border-t border-zinc-800/80">
                  <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                    Upcoming / unscheduled
                  </span>
                  <div className="flex flex-col pl-4 gap-1">
                    {otherTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskForReason(task)}
                        className="group flex items-center justify-between p-2.5 -mx-2.5 rounded-none cursor-pointer border border-transparent hover:border-zinc-700/60 hover:bg-[#18181d] hover:shadow-lg hover:shadow-black/20 hover:translate-x-1 transition-all duration-150"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                            <SourceLogo source={task.source} size={26} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
                              {task.title}
                            </h4>
                            <p className="text-xs text-zinc-400 group-hover:text-zinc-300 mt-0.5 font-normal transition-colors">
                              {formatTaskSubtitle(task, mockNow)}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 shrink-0 ml-4 transition-all duration-150" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComingUpSection;
