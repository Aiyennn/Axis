import React from 'react';
import { Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TodayScheduleWidget: React.FC = () => {
  const { tasks } = useApp();

  const nowTask = tasks.find(t => t.priorityBucket === 'now' && t.status === 'pending');
  const nextTask = tasks.find(t => t.priorityBucket === 'next' && t.status === 'pending');

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-bold text-white tracking-tight">Today's Schedule</h3>
      </div>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-zinc-800">
        {/* Item 1: Now */}
        <div className="relative">
          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-violet-500 shadow-sm shadow-violet-500/50"></div>
          <div className="text-[11px] font-mono font-semibold text-violet-400 uppercase tracking-wider">Now</div>
          <div className="text-sm font-semibold text-zinc-100 mt-0.5">
            {nowTask ? nowTask.title : 'Focus Session Ready'}
          </div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5">
            ~ {nowTask ? nowTask.estimatedHours : 2}h
          </div>
        </div>

        {/* Item 2: Afternoon */}
        <div className="relative">
          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-zinc-600"></div>
          <div className="text-[11px] font-mono text-zinc-400">5:00 PM</div>
          <div className="text-sm font-medium text-zinc-200 mt-0.5">
            {nextTask ? nextTask.title : 'Secondary Work Block'}
          </div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5">
            ~ {nextTask ? nextTask.estimatedHours : 0.5}h
          </div>
        </div>

        {/* Item 3: Later */}
        <div className="relative">
          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border border-zinc-600 bg-[#121215]"></div>
          <div className="text-[11px] font-mono text-zinc-500">Later</div>
          <div className="text-sm font-medium text-zinc-400 mt-0.5">
            Other tasks
          </div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5">
            ~ 3h+
          </div>
        </div>
      </div>
    </div>
  );
};
