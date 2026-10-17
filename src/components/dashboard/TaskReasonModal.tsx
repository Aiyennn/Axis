import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Sparkles, AlertTriangle, ShieldCheck, Clock, Calendar } from 'lucide-react';

export const TaskReasonModal: React.FC = () => {
  const { selectedTaskForReason, setSelectedTaskForReason } = useApp();

  if (!selectedTaskForReason) return null;

  const task = selectedTaskForReason;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-800/40 uppercase font-semibold">
                AI Prioritization Reasoning
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {task.sourceLabel}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">{task.title}</h3>
          </div>

          <button
            onClick={() => setSelectedTaskForReason(null)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Priority Score Summary */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#18181b] border border-[#27272a]">
          <div>
            <div className="text-xs text-zinc-400 uppercase font-mono tracking-wider">Overall Priority Score</div>
            <div className="text-xs text-zinc-500 mt-0.5">Bucket: <span className="font-semibold text-violet-400 uppercase">{task.priorityBucket}</span></div>
          </div>
          <div className="text-2xl font-bold font-mono text-violet-400">
            {task.priorityScore} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
          </div>
        </div>

        {/* 4-Factor Points Breakdown Grid */}
        <div>
          <div className="text-xs font-semibold text-zinc-400 uppercase font-mono tracking-wider mb-2">
            Factor Weight Breakdown
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#18181b] border border-[#27272a]">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-500" /> Deadline Proximity</span>
                <span className="font-mono font-bold text-zinc-100">{task.scoreBreakdown.deadlineProximity} / 40</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#18181b] border border-[#27272a]">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-zinc-500" /> Consequence</span>
                <span className="font-mono font-bold text-zinc-100">{task.scoreBreakdown.consequenceWeight} / 25</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#18181b] border border-[#27272a]">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-zinc-500" /> Calendar Slot Fit</span>
                <span className="font-mono font-bold text-zinc-100">{task.scoreBreakdown.calendarFit} / 20</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#18181b] border border-[#27272a]">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-zinc-500" /> Importance</span>
                <span className="font-mono font-bold text-zinc-100">{task.scoreBreakdown.importanceScore} / 15</span>
              </div>
            </div>
          </div>
        </div>

        {/* Explainable Rationale Details */}
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] text-xs">
            <div className="font-semibold text-zinc-300 mb-1">Why Axis prioritized this:</div>
            <div className="text-zinc-400 leading-relaxed">{task.reasoning}</div>
          </div>

          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/40 text-xs">
            <div className="font-semibold text-rose-300 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Consequences of delaying:</span>
            </div>
            <div className="text-rose-200/90 leading-relaxed">{task.consequencesOfDelay}</div>
          </div>
        </div>

        {/* Modal Close Button */}
        <button
          onClick={() => setSelectedTaskForReason(null)}
          className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors mt-2"
        >
          Close Explanation
        </button>
      </div>
    </div>
  );
};
