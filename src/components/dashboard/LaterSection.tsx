import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { SourceLogo } from '../shared/SourceLogo';
import { Task } from '../../types';

function formatTaskSubtitle(task: Task): string {
  let timeStr = '';
  const lower = task.deadline.toLowerCase();
  if (lower.includes('12:00')) timeStr = '12:00 PM';
  else if (lower.includes('9:00')) timeStr = '9:00 AM';
  else if (lower.includes('5:00')) timeStr = '5:00 PM';
  else if (lower.includes('6:00')) timeStr = '6:00 PM';
  else if (lower.includes('11:59')) timeStr = '11:59 PM';
  else timeStr = task.deadline;

  const hoursStr = task.estimatedHours === 1 ? '1 Hour' : `${task.estimatedHours} Hours`;
  return `${timeStr} - ${hoursStr}`;
}

export const LaterSection: React.FC = () => {
  const { tasks, setSelectedTaskForReason } = useApp();
  const [isExpanded, setIsExpanded] = useState(true);

  const laterTasks = tasks.filter(t => t.priorityBucket === 'later' && t.status === 'pending');

  // Group by day label (Thursday, Friday, etc.)
  const thursdayTasks = laterTasks.filter(t => t.deadline.toLowerCase().includes('thursday'));
  const fridayTasks = laterTasks.filter(t => t.deadline.toLowerCase().includes('friday'));
  const otherLaterTasks = laterTasks.filter(t => !thursdayTasks.includes(t) && !fridayTasks.includes(t));

  // Get unique sources actually present in laterTasks
  const uniqueSources = Array.from(new Set(laterTasks.map(t => t.source)));

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-7 shadow-xl shadow-black/40">
      {/* Header row: overlapping logos + 'LATER' on left, 'X tasks >' / accordion on right */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          {/* Overlapping integration logos dynamically based on content */}
          {uniqueSources.length > 0 && (
            <div className="flex items-center -space-x-2">
              {uniqueSources.map((source, index) => (
                <div
                  key={source}
                  style={{ zIndex: 10 + index }}
                  className="relative w-8 h-8 rounded-full bg-[#1c1c21] p-0.5 border border-zinc-800 flex items-center justify-center shadow-md"
                >
                  <SourceLogo source={source} size={20} />
                </div>
              ))}
            </div>
          )}

          <h3 className="text-base font-bold text-white tracking-wider uppercase">
            LATER
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">
            {laterTasks.length} tasks
          </span>
          <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
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
          {laterTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-[#27272a] rounded-2xl">
              No tasks scheduled for later
            </div>
          ) : (
            <>
              {/* Thursday group */}
              {thursdayTasks.length > 0 && (
                <div className="flex flex-col pb-5 border-b border-zinc-800/80">
                  <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                    Thursday
                  </span>
                  <div className="flex flex-col pl-4">
                    {thursdayTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskForReason(task)}
                        className="group flex items-center justify-between py-2 cursor-pointer hover:opacity-90 transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <SourceLogo source={task.source} size={26} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
                              {task.title}
                            </h4>
                            <p className="text-xs text-zinc-400 mt-0.5 font-normal">
                              {formatTaskSubtitle(task)}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 shrink-0 ml-4 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friday group */}
              {fridayTasks.length > 0 && (
                <div className="flex flex-col pt-5">
                  <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                    Friday
                  </span>
                  <div className="flex flex-col pl-4">
                    {fridayTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskForReason(task)}
                        className="group flex items-center justify-between py-2 cursor-pointer hover:opacity-90 transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <SourceLogo source={task.source} size={26} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
                              {task.title}
                            </h4>
                            <p className="text-xs text-zinc-400 mt-0.5 font-normal">
                              {formatTaskSubtitle(task)}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 shrink-0 ml-4 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other later tasks */}
              {otherLaterTasks.length > 0 && (
                <div className="flex flex-col pt-5 border-t border-zinc-800/80">
                  <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                    Next Week & Beyond
                  </span>
                  <div className="flex flex-col pl-6">
                    {otherLaterTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskForReason(task)}
                        className="group flex items-center justify-between py-2 cursor-pointer hover:opacity-90 transition-all"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-9 h-9 flex items-center justify-center shrink-0">
                            <SourceLogo source={task.source} size={28} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-normal text-zinc-100 group-hover:text-white transition-colors truncate">
                              {task.title}
                            </h4>
                            <p className="text-xs text-zinc-400 mt-0.5 font-normal">
                              {formatTaskSubtitle(task)}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 shrink-0 ml-4 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
