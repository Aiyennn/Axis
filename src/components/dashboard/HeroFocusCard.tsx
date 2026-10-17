import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Target, Clock, CheckCircle2, ChevronDown, ChevronUp, Play, Sparkles } from 'lucide-react';

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
    <div className="relative bg-gradient-to-br from-[#161224] to-[#121218] border-2 border-violet-900/50 hover:border-violet-700/60 transition-all rounded-2xl p-6 shadow-xl shadow-black/50">
      {/* Top Tag Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-wider">
          <Target className="w-3.5 h-3.5 text-violet-400" />
          <span>YOUR FOCUS</span>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>~ {focusTask.estimatedHours} hours</span>
        </div>
      </div>

      {/* Task Title */}
      <h2 className="text-2xl font-bold tracking-tight text-white mb-3 leading-snug">
        {focusTask.title}
      </h2>

      {/* Meta Source & Deadline badges */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-zinc-300 font-medium">✉️ {focusTask.sourceLabel}</span>
        {focusTask.isHardDeadline && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-950/80 text-rose-400 border border-rose-800/50">
            HARD
          </span>
        )}
      </div>

      {/* Reassuring Rationale */}
      <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
        {focusTask.reasoning}
      </p>

      {/* Primary Action Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setInFocusSession(!inFocusSession)}
          className={`flex-1 py-3 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
            inFocusSession
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/40'
          }`}
        >
          {inFocusSession ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>In Focus Session (Active)</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Start focus session</span>
            </>
          )}
        </button>

        <button
          onClick={() => toggleTaskComplete(focusTask.id)}
          className="py-3 px-4 rounded-xl border border-zinc-700 hover:border-emerald-500 text-zinc-300 hover:text-emerald-400 text-sm font-medium transition-colors"
          title="Mark complete"
        >
          Complete
        </button>
      </div>

      {/* View Details Accordion Trigger */}
      <div className="mt-4 pt-3 border-t border-[#27272a]/60">
        <button
          onClick={() => {
            setShowDetails(!showDetails);
            setSelectedTaskForReason(focusTask);
          }}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors font-medium"
        >
          <span>View details & AI score breakdown</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDetails && (
          <div className="mt-3 p-3.5 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 flex flex-col gap-2 animation-fadeIn">
            <div className="flex justify-between items-center text-zinc-400">
              <span>Overall Priority Score</span>
              <span className="font-mono font-bold text-violet-400 text-sm">{focusTask.priorityScore} / 100</span>
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
