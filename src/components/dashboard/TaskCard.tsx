import React from 'react';
import { Task, PriorityBucket } from '../../types';
import { useApp } from '../../context/AppContext';
import { Clock, CheckCircle2, HelpCircle } from 'lucide-react';

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { toggleTaskComplete, updateTaskPriority, setSelectedTaskForReason } = useApp();

  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`group relative bg-[#18181b] border rounded-lg p-3.5 flex flex-col gap-2.5 transition-all duration-150 ${
        isCompleted
          ? 'opacity-50 border-[#27272a] bg-[#121215]'
          : 'border-[#27272a] hover:border-[#3f3f46] hover:shadow-md hover:shadow-black/40'
      }`}
    >
      {/* Top Meta Row */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-zinc-400 font-medium">{task.sourceLabel}</span>
          {task.isHardDeadline && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider bg-rose-950/60 text-rose-400 border border-rose-800/40">
              Hard
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-zinc-500" />
          <span
            className={`font-mono font-medium ${
              task.isHardDeadline ? 'text-rose-400' : 'text-zinc-400'
            }`}
          >
            {task.deadline}
          </span>
        </div>
      </div>

      {/* Title & Checkbox */}
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => toggleTaskComplete(task.id)}
          className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition-colors"
          title={isCompleted ? 'Mark as pending' : 'Mark as complete'}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <div className="w-4 h-4 rounded border border-zinc-600 hover:border-emerald-500" />
          )}
        </button>

        <h4
          onClick={() => setSelectedTaskForReason(task)}
          className={`text-sm font-semibold leading-snug cursor-pointer transition-colors ${
            isCompleted
              ? 'line-through text-zinc-500'
              : 'text-zinc-100 hover:text-violet-300'
          }`}
        >
          {task.title}
        </h4>
      </div>

      {/* AI Rationale Summary Tag */}
      <div
        onClick={() => setSelectedTaskForReason(task)}
        className="cursor-pointer text-xs text-zinc-400 bg-[#09090b] border-l-2 border-violet-500 px-2.5 py-1.5 rounded-r flex items-center justify-between group/r hover:bg-[#121215] transition-colors"
      >
        <span className="truncate pr-2">{task.reasoning}</span>
        <HelpCircle className="w-3.5 h-3.5 text-zinc-500 group-hover/r:text-violet-400 shrink-0" />
      </div>

      {/* Bottom Footer Details */}
      <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-[#27272a]/60 mt-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] bg-[#222226] px-1.5 py-0.5 rounded text-zinc-300">
            {task.estimatedHours}h
          </span>
          <span className="font-mono text-[11px] text-violet-400 font-semibold">
            {task.priorityScore} pts
          </span>
        </div>

        {/* Priority Bucket Selector */}
        <div className="flex items-center gap-1">
          <select
            value={task.priorityBucket}
            onChange={(e) => updateTaskPriority(task.id, e.target.value as PriorityBucket)}
            className="text-[11px] font-mono bg-[#121215] text-zinc-300 border border-[#27272a] rounded px-1.5 py-0.5 focus:outline-none focus:border-violet-500"
          >
            <option value="now">Do Now</option>
            <option value="next">Do Next</option>
            <option value="later">Do Later</option>
          </select>
        </div>
      </div>
    </div>
  );
};

