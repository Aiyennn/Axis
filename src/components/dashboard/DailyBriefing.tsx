/**
 * DailyBriefing.tsx
 * A slim banner at the top of the dashboard that shows:
 * - Active task count
 * - Workload hours vs free hours
 * - Overload alert (rose badge) when workload > free time
 * - Clear state (green badge) when comfortable
 */

import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateCapacity } from '../../engine/scheduler';
import { AlertTriangle, CheckCircle2, BookOpen } from 'lucide-react';

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

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex items-center gap-4 px-5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 mb-4">
      {/* Date + task count */}
      <div className="flex items-center gap-2 min-w-0">
        <BookOpen size={14} className="text-zinc-500 shrink-0" />
        <span className="text-xs text-zinc-500 truncate">{todayDate}</span>
        <span className="text-xs text-zinc-600">·</span>
        <span className="text-xs text-zinc-400">
          <span className="text-white font-medium">{activeTasks.length}</span> active tasks
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-zinc-800 shrink-0" />

      {/* Workload summary */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span>
          <span className="text-white font-medium">{capacity.totalWorkloadHours}h</span> workload
        </span>
        <span className="text-zinc-600">vs</span>
        <span>
          <span className="text-white font-medium">{capacity.availableFreeHours}h</span> free
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-zinc-800 shrink-0" />

      {/* Status badge */}
      {capacity.isOverloaded ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-900/50 ml-auto shrink-0">
          <AlertTriangle size={12} className="text-rose-400" />
          <span className="text-xs font-medium text-rose-400">
            {capacity.deficitHours}h deficit — reschedule or delegate
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-900/50 ml-auto shrink-0">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">
            Schedule looks clear
          </span>
        </div>
      )}
    </div>
  );
}
