import React from 'react';
import { Sparkles, BarChart2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TodayFocusCapacityWidget: React.FC = () => {
  const { tasks } = useApp();

  const totalUrgentHours = tasks
    .filter(t => (t.priorityBucket === 'now' || t.priorityBucket === 'next') && t.status === 'pending')
    .reduce((sum, t) => sum + t.estimatedHours, 0);

  const availableHours = 4.5;
  const isOverloaded = totalUrgentHours > availableHours;
  const deficit = Math.max(0, totalUrgentHours - availableHours);

  // Percentage for ring (capped at 100% or showing over)
  const percent = Math.min(100, Math.round((2.0 / availableHours) * 100));
  const strokeDashoffset = 100 - percent;

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white tracking-tight">Today's Focus</h3>
        <BarChart2 className="w-4 h-4 text-violet-400" />
      </div>

      <div className="flex items-center gap-4 mb-4">
        {/* Circular Progress Ring */}
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-zinc-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={isOverloaded ? "text-rose-500" : "text-violet-500"}
              strokeDasharray="100, 100"
              strokeDashoffset={strokeDashoffset}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>

        <div>
          <div className="text-lg font-bold font-mono text-white">
            {totalUrgentHours.toFixed(1)}h <span className="text-zinc-500 text-sm font-normal">/ {availableHours}h</span>
          </div>
          <div className="text-xs text-zinc-400">available time</div>
        </div>
      </div>

      {isOverloaded ? (
        <div className="flex items-center gap-2 p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-xl text-rose-300 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Overload: {deficit.toFixed(1)}h capacity gap today.</span>
        </div>
      ) : (
        <div className="flex items-start gap-2 pt-2 border-t border-[#27272a] text-xs text-zinc-400">
          <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <span>One focused task at a time. You got this.</span>
        </div>
      )}
    </div>
  );
};

