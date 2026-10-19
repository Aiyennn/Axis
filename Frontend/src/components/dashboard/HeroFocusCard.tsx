import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Target, Clock, CheckCircle2, ChevronDown, ChevronUp, Play, Sparkles } from 'lucide-react';
import { SourceLogo } from '../shared/SourceLogo';

export const HeroFocusCard: React.FC = () => {
  const { tasks, toggleTaskComplete, setSelectedTaskForReason } = useApp();
  const [showDetails, setShowDetails] = useState(false);
  const [inFocusSession, setInFocusSession] = useState(false);

  // The primary focus is the highest-scoring pending task in "now", or the top pending task
  const focusTask = tasks.find(t => t.priorityBucket === 'now' && t.status === 'pending') ||
                    tasks.find(t => t.status === 'pending');

  if (!focusTask) {
    return (
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-8 text-center text-zinc-400">
        <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-white">All clear for today!</h3>
        <p className="text-sm text-zinc-500">You've completed all high-priority responsibilities.</p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#121215] border border-[#27272a] hover:border-zinc-700/80 transition-all rounded-3xl p-7 shadow-xl shadow-black/40">
      {/* Top Header Row: Integration Logo + Pill badge on left, Estimated hours on right */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Large prominent source logo */}
          <div className="w-10 h-10 flex items-center justify-center">
            <SourceLogo source={focusTask.source} size={36} />
          </div>

          {/* Minimal rounded pill: Source label */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1c1c21] border border-zinc-800 text-zinc-300 text-xs font-medium">
            <Target className="w-3.5 h-3.5 text-zinc-400" />
            <span>{focusTask.sourceLabel || (focusTask.source === 'email' ? 'Email from Client' : 'Task')}</span>
          </div>
        </div>

        {/* Time estimate right-aligned */}
        <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>~ {focusTask.estimatedHours} hours</span>
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

      {/* Action Buttons Row matching screenshot */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setInFocusSession(!inFocusSession)}
          className={`flex-1 py-3.5 px-6 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            inFocusSession
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              : 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-white/5'
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
          onClick={() => toggleTaskComplete(focusTask.id)}
          className="py-3.5 px-7 rounded-full border border-zinc-800 bg-[#16161a] hover:bg-[#202026] text-zinc-200 hover:text-white text-sm font-medium transition-all"
        >
          Complete
        </button>
      </div>

      {/* Accordion Toggle */}
      <div className="mt-5 pt-3">
        <button
          onClick={() => {
            setShowDetails(!showDetails);
            setSelectedTaskForReason(focusTask);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors font-normal"
        >
          <span>View details & AI score breakdown</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDetails && (
          <div className="mt-3 p-4 bg-[#09090b] border border-[#27272a] rounded-2xl text-xs text-zinc-300 flex flex-col gap-2">
            <div className="flex justify-between items-center text-zinc-400">
              <span>Overall Priority Score</span>
              <span className="font-mono font-bold text-zinc-100 text-sm">{focusTask.priorityScore} / 100</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 mt-1">
              <div>Deadline Proximity: <span className="text-zinc-200 font-mono font-semibold">{focusTask.scoreBreakdown.deadlineProximity} pts</span></div>
              <div>Consequence Weight: <span className="text-zinc-200 font-mono font-semibold">{focusTask.scoreBreakdown.consequenceWeight} pts</span></div>
              <div>Calendar Slot Fit: <span className="text-zinc-200 font-mono font-semibold">{focusTask.scoreBreakdown.calendarFit} pts</span></div>
              <div>Importance Weight: <span className="text-zinc-200 font-mono font-semibold">{focusTask.scoreBreakdown.importanceScore} pts</span></div>
            </div>
            <div className="text-zinc-400 mt-1 pt-1 border-t border-zinc-800">
              <span className="text-rose-400 font-medium">Consequence of delay:</span> {focusTask.consequencesOfDelay}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
