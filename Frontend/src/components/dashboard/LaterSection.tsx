import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronRight, ChevronDown } from 'lucide-react';
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
  else if (lower.includes('4:00')) timeStr = '4:00 PM';
  else timeStr = task.deadline;

  const durationStr = `${task.estimatedHours} Hour${task.estimatedHours === 1 ? '' : 's'}`;
  return `${timeStr} - ${durationStr}`;
}

export const LaterSection: React.FC = () => {
  const { tasks, setSelectedTaskForReason } = useApp();
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter tasks belonging to "later" priority bucket that are pending
  const laterTasks = tasks.filter(t => t.priorityBucket === 'later' && t.status === 'pending');

  // Group into Thursday, Friday, and others
  const thursdayTasks = laterTasks.filter(t => t.deadline.toLowerCase().includes('thursday'));
  const fridayTasks = laterTasks.filter(t => t.deadline.toLowerCase().includes('friday'));
  const otherLaterTasks = laterTasks.filter(t => !thursdayTasks.includes(t) && !fridayTasks.includes(t));

  // Get unique sources actually present in laterTasks
  const uniqueSources = Array.from(new Set(laterTasks.map(t => t.source)));

  return (
    <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700/80 transition-all duration-200 rounded-none p-7 shadow-xl shadow-black/40">
      {/* Header row: overlapping logos + 'LATER' on left, 'X tasks' and toggle chevron on right */}
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
            LATER
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium group-hover/header:text-zinc-300 transition-colors">
            {laterTasks.length} tasks
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
          {laterTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-[#27272a] rounded-none">
              No tasks scheduled for later
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Thursday group */}
              {thursdayTasks.length > 0 && (
                <div className="flex flex-col pb-5 border-b border-zinc-800/80">
                  <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                    Thursday
                  </span>
                  <div className="flex flex-col pl-4 gap-1">
                    {thursdayTasks.map(task => (
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
                              {formatTaskSubtitle(task)}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 shrink-0 ml-4 transition-all duration-150" />
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
                  <div className="flex flex-col pl-4 gap-1">
                    {fridayTasks.map(task => (
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
                              {formatTaskSubtitle(task)}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 shrink-0 ml-4 transition-all duration-150" />
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
                  <div className="flex flex-col pl-4 gap-1">
                    {otherLaterTasks.map(task => (
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
                              {formatTaskSubtitle(task)}
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

export default LaterSection;
