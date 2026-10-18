/**
 * DailyBriefing.tsx
 * Summary section matching the design screenshot:
 * - 'Here are the Summary:' label connected directly above the pill bar
 * - Clear, high-contrast, readable text
 */

import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateCapacity } from '../../engine/scheduler';
import { BookOpen } from 'lucide-react';

export default function DailyBriefing() {
  const { tasks, calendarEvents } = useApp();

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed'),
    [tasks]
  );

  const capacity = useMemo(
    () => calculateCapacity(tasks, calendarEvents),
    [tasks, calendarEvents]
  );

  return (
    <div className="flex flex-col mb-8 mt-1">
      {/* Connected Header Label */}
      <h3 className="text-sm font-semibold text-zinc-100 mb-2.5 tracking-tight">
        Here are the Summary:
      </h3>

      {/* Summary Pill Bar with high-contrast, crisp readable typography */}
      <div className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-[#141418] border border-zinc-700/80 text-sm shadow-md">
        {/* Date + task count */}
        <div className="flex items-center gap-2.5">
          <BookOpen size={16} className="text-zinc-400 shrink-0" />
          <span className="text-zinc-200 font-medium">Sunday, October 18</span>
          <span className="text-zinc-500 font-bold">·</span>
          <span className="text-zinc-300">
            <span className="text-white font-semibold">{activeTasks.length}</span> active tasks
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-700" />

        {/* Workload vs free hours */}
        <div className="flex items-center gap-2">
          <span>
            <span className="text-white font-semibold">{capacity.totalWorkloadHours}h</span>{' '}
            <span className="text-zinc-300">workload</span>
          </span>
          <span className="text-zinc-400 font-normal">vs</span>
          <span>
            <span className="text-white font-semibold">{capacity.availableFreeHours}h</span>{' '}
            <span className="text-zinc-300">free</span>
          </span>
        </div>
      </div>
    </div>
  );
}
