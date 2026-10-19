import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { SourceLogo } from '../shared/SourceLogo';
import { Task } from '../../types';

// Helper to format time & duration like '9:00 AM - 3 Hours' or '5:00 PM - 0.5 Hours'
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

export const ComingUpSection: React.FC = () => {
  const { tasks, setSelectedTaskForReason } = useApp();
  const [isExpanded, setIsExpanded] = useState(true);

  // Tasks in "next" bucket
  const comingUpTasks = tasks.filter(t => t.priorityBucket === 'next' && t.status === 'pending');

  // Group by day label (Today vs Tomorrow vs Later)
  const todayTasks = comingUpTasks.filter(t => {
    const d = t.deadline.toLowerCase();
    return d.includes('today') || (!d.includes('tomorrow') && !d.includes('friday') && !d.includes('thursday'));
  });

  const tomorrowTasks = comingUpTasks.filter(t => {
    const d = t.deadline.toLowerCase();
    return d.includes('tomorrow');
  });

  const otherTasks = comingUpTasks.filter(t => !todayTasks.includes(t) && !tomorrowTasks.includes(t));

  // Get unique sources actually present in comingUpTasks
  const uniqueSources = Array.from(new Set(comingUpTasks.map(t => t.source)));

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-7 shadow-xl shadow-black/40">
      {/* Header row: overlapping logos + 'COMING UP' on left, 'X tasks' and toggle chevron on right */}
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
            COMING UP
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">
            {comingUpTasks.length} tasks
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
          {comingUpTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-[#27272a] rounded-2xl">
              No upcoming tasks scheduled
            </div>
          ) : (
            <div className="flex flex-col">
          {/* Today Group */}
          {todayTasks.length > 0 && (
            <div className="flex flex-col pb-5 border-b border-zinc-800/80">
              <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                Today
              </span>
              <div className="flex flex-col pl-4">
                {todayTasks.map(task => (
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

          {/* Tomorrow Group */}
          {tomorrowTasks.length > 0 && (
            <div className="flex flex-col pt-5">
              <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                Tomorrow
              </span>
              <div className="flex flex-col pl-4">
                {tomorrowTasks.map(task => (
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

          {/* Other/Upcoming Group (if any) */}
          {otherTasks.length > 0 && (
            <div className="flex flex-col pt-5 border-t border-zinc-800/80">
              <span className="text-lg font-medium text-zinc-200 mb-3 block tracking-tight">
                Later This Week
              </span>
              <div className="flex flex-col pl-6">
                {otherTasks.map(task => (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
