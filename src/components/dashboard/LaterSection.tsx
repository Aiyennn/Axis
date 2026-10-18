import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Layers, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

export const LaterSection: React.FC = () => {
  const { tasks, toggleTaskComplete, setSelectedTaskForReason } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);

  const laterTasks = tasks.filter(t => t.priorityBucket === 'later' && t.status === 'pending');

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-5 shadow-lg">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base font-bold text-white tracking-tight">Later</h3>
          <span className="text-xs text-zinc-400 font-mono font-medium">{laterTasks.length} tasks</span>
        </div>

        <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-xs text-zinc-500 mt-1 mb-2">
        Your literature review and personal errands are safely organized here.
      </p>

      {isExpanded && (
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[#27272a]">
          {laterTasks.map(task => (
            <div
              key={task.id}
              onClick={() => setSelectedTaskForReason(task)}
              className="flex items-center justify-between p-3 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-zinc-700 transition-all cursor-pointer"
            >
              <div>
                <h4 className="text-sm font-medium text-zinc-200">{task.title}</h4>
                <span className="text-[11px] text-zinc-500 font-mono">{task.sourceLabel} • {task.deadline}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTaskComplete(task.id);
                }}
                className="text-zinc-500 hover:text-emerald-400 transition-colors p-1"
                title="Mark complete"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

