import React from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar, GraduationCap, FileText, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Task } from '../../types';

export const ComingUpSection: React.FC = () => {
  const { tasks, toggleTaskComplete, setSelectedTaskForReason } = useApp();

  // Tasks in "next" bucket
  const comingUpTasks = tasks.filter(t => t.priorityBucket === 'next' && t.status === 'pending');

  const getSourceIcon = (task: Task) => {
    if (task.source === 'canvas') {
      return <GraduationCap className="w-4 h-4 text-violet-400" />;
    }
    return <FileText className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-400" />
          <h3 className="text-base font-bold text-white tracking-tight">Coming Up</h3>
        </div>
        <span className="text-xs text-zinc-400 font-mono font-medium flex items-center gap-1">
          {comingUpTasks.length} tasks <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {comingUpTasks.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500 border border-dashed border-[#27272a] rounded-xl">
            No secondary tasks pending
          </div>
        ) : (
          comingUpTasks.map(task => (
            <div
              key={task.id}
              onClick={() => setSelectedTaskForReason(task)}
              className="group flex items-center justify-between p-3.5 rounded-xl bg-[#18181b] hover:bg-[#1f1f24] border border-[#27272a] hover:border-zinc-700 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#222228] border border-[#27272a] flex items-center justify-center shrink-0">
                  {getSourceIcon(task)}
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors truncate">
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                    <span>📅 {task.deadline}</span>
                    <span>•</span>
                    <span>{task.estimatedHours} hours</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskComplete(task.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-emerald-400"
                  title="Mark complete"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

