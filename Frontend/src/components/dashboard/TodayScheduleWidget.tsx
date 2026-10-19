import React from 'react';
import { Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TodayScheduleWidget: React.FC = () => {
  const { tasks, setSelectedTaskForReason } = useApp();

  const nowTask = tasks.find(t => t.priorityBucket === 'now' && t.status === 'pending');
  const nextTask = tasks.find(t => t.priorityBucket === 'next' && t.status === 'pending');

  return (
    <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700/80 hover:shadow-xl hover:shadow-black/30 transition-all duration-200 rounded-none p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-bold text-white tracking-tight">Today's Schedule</h3>
      </div>

      <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-[1.5px] before:bg-zinc-800">
        {/* Item 1: Now */}
        <div
          onClick={() => nowTask && setSelectedTaskForReason(nowTask)}
          className="relative group p-2 -mx-2 rounded-none border border-transparent hover:border-zinc-700/50 hover:bg-[#18181d] hover:translate-x-0.5 transition-all duration-150 cursor-pointer"
        >
          <div className="absolute -left-6 top-3 w-2.5 h-2.5 rounded-none bg-white shadow-sm shadow-white/30 group-hover:scale-125 group-hover:ring-2 group-hover:ring-white/40 transition-all"></div>
          <div className="text-[11px] font-mono font-semibold text-zinc-300 uppercase tracking-wider group-hover:text-white transition-colors">Now</div>
          <div className="text-sm font-semibold text-zinc-100 group-hover:text-white mt-0.5 transition-colors">
            {nowTask ? nowTask.title : 'Focus Session Ready'}
          </div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5 group-hover:text-zinc-400 transition-colors">
            ~ {nowTask ? nowTask.estimatedHours : 2}h
          </div>
        </div>

        {/* Item 2: Afternoon */}
        <div
          onClick={() => nextTask && setSelectedTaskForReason(nextTask)}
          className="relative group p-2 -mx-2 rounded-none border border-transparent hover:border-zinc-700/50 hover:bg-[#18181d] hover:translate-x-0.5 transition-all duration-150 cursor-pointer"
        >
          <div className="absolute -left-6 top-3 w-2.5 h-2.5 rounded-none bg-zinc-600 group-hover:bg-zinc-400 group-hover:scale-125 transition-all"></div>
          <div className="text-[11px] font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors">5:00 PM</div>
          <div className="text-sm font-medium text-zinc-200 group-hover:text-white mt-0.5 transition-colors">
            {nextTask ? nextTask.title : 'Secondary Work Block'}
          </div>
          <div className="text-xs text-zinc-500 font-mono mt-0.5 group-hover:text-zinc-400 transition-colors">
            ~ {nextTask ? nextTask.estimatedHours : 0.5}h
          </div>
        </div>

        {/* Item 3: Later */}
        <div className="relative group p-2 -mx-2 rounded-none border border-transparent hover:border-zinc-700/50 hover:bg-[#18181d] hover:translate-x-0.5 transition-all duration-150 cursor-default">
          <div className="absolute -left-6 top-3 w-2.5 h-2.5 rounded-none border border-zinc-600 bg-[#121215] group-hover:border-zinc-400 group-hover:scale-125 transition-all"></div>
          <div className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-400 transition-colors">Later</div>
          <div className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 mt-0.5 transition-colors">
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

export default TodayScheduleWidget;
