import React from 'react';
import { useApp } from '../../context/AppContext';
import { TaskCard } from './TaskCard';
import { Flame, Clock3, CalendarCheck } from 'lucide-react';

export const PriorityColumns: React.FC = () => {
  const { tasks } = useApp();

  const nowTasks = tasks.filter(t => t.priorityBucket === 'now');
  const nextTasks = tasks.filter(t => t.priorityBucket === 'next');
  const laterTasks = tasks.filter(t => t.priorityBucket === 'later');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* DO NOW COLUMN */}
      <div className="bg-[#121215] border border-[#27272a] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Do Now</span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-400 font-semibold">
            {nowTasks.length}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 flex-1 min-h-[160px]">
          {nowTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 text-xs border border-dashed border-[#27272a] rounded-lg">
              <Flame className="w-6 h-6 mb-2 text-zinc-600" />
              <span>No immediate critical tasks</span>
            </div>
          ) : (
            nowTasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>

      {/* DO NEXT COLUMN */}
      <div className="bg-[#121215] border border-[#27272a] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Do Next</span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-400 font-semibold">
            {nextTasks.length}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 flex-1 min-h-[160px]">
          {nextTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 text-xs border border-dashed border-[#27272a] rounded-lg">
              <Clock3 className="w-6 h-6 mb-2 text-zinc-600" />
              <span>No secondary tasks scheduled</span>
            </div>
          ) : (
            nextTasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>

      {/* DO LATER COLUMN */}
      <div className="bg-[#121215] border border-[#27272a] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Do Later</span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-400 font-semibold">
            {laterTasks.length}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 flex-1 min-h-[160px]">
          {laterTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 text-xs border border-dashed border-[#27272a] rounded-lg">
              <CalendarCheck className="w-6 h-6 mb-2 text-zinc-600" />
              <span>Nothing deferred</span>
            </div>
          ) : (
            laterTasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>
    </div>
  );
};

