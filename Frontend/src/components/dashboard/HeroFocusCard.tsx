import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Target, Clock, CheckCircle2, Play, Sparkles } from 'lucide-react';
import { SourceLogo } from '../shared/SourceLogo';

export const HeroFocusCard: React.FC = () => {
  const { tasks, toggleTaskComplete, setSelectedTaskForReason } = useApp();
  const [inFocusSession, setInFocusSession] = useState(false);

  // The primary focus is the highest-scoring pending task in "now", or the top pending task
  const focusTask = tasks.find(t => t.status === 'pending');

  if (!focusTask) {
    return (
      <div className="bg-[#121215] border border-[#27272a] rounded-none p-8 text-center text-zinc-400">
        <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-white">No pending tasks</h3>
        <p className="text-sm text-zinc-500">Import mock feeds to populate your workspace.</p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#121215] border border-[#27272a] hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/60 transition-all duration-200 rounded-none p-7 shadow-xl shadow-black/40">
      {/* Top Header Row: Integration Logo + Pill badge on left, Estimated hours on right */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Large prominent source logo */}
          <div className="w-10 h-10 flex items-center justify-center hover:scale-110 transition-transform duration-200">
            <SourceLogo source={focusTask.source} size={36} />
          </div>

          {/* Minimal rectilinear pill: Source label */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-[#1c1c21] border border-zinc-800 hover:bg-[#25252c] hover:border-zinc-700 text-zinc-300 text-xs font-medium transition-all cursor-default">
            <Target className="w-3.5 h-3.5 text-zinc-400" />
            <span>{focusTask.sourceLabel || (focusTask.source === 'email' ? 'Email from Client' : 'Task')}</span>
          </div>
        </div>

        {/* Time estimate right-aligned */}
        <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>{focusTask.estimatedHours === null ? "Estimate needed" : `~ ${focusTask.estimatedHours} hours`}</span>
        </div>
      </div>

      {/* Task Title */}
      <h2 className="text-2xl font-bold tracking-tight text-white mb-4 leading-snug">
        {focusTask.title}
      </h2>

      {/* AI Definition & Rationale */}
      <p className="text-sm text-zinc-400 mb-7 leading-relaxed font-normal">
        {focusTask.reasoning}
      </p>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setInFocusSession(!inFocusSession)}
          className={`flex-1 py-3.5 px-6 rounded-none font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] ${
            inFocusSession
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 hover:shadow-emerald-900/50'
              : 'bg-white hover:bg-zinc-100 text-zinc-950 shadow-white/5 hover:shadow-white/20'
          }`}
        >
          {inFocusSession ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>In Focus Session (Active)</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-zinc-950 text-zinc-950" />
              <span>Start focus session</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => toggleTaskComplete(focusTask.id)}
          className="py-3.5 px-7 rounded-none border border-zinc-800 bg-[#16161a] hover:bg-[#202026] hover:border-emerald-600/50 hover:text-emerald-300 active:scale-[0.98] text-zinc-200 text-sm font-medium transition-all duration-150"
        >
          Complete
        </button>
      </div>

      {/* Dedicated Button replacing previous dropdown accordion */}
      <div className="mt-5 pt-4 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => setSelectedTaskForReason(focusTask)}
          className="w-full py-3 px-4 bg-[#18181d] hover:bg-[#202026] text-zinc-300 hover:text-white border border-[#27272a] hover:border-zinc-700 text-xs sm:text-sm font-semibold rounded-none transition-all duration-150 flex items-center justify-center gap-2 group"
        >
          <Sparkles className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
          <span>View details & priority breakdown</span>
        </button>
      </div>
    </div>
  );
};

export default HeroFocusCard;
