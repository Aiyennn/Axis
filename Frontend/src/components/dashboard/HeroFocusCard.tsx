import React, { useEffect, useState } from 'react';
import type { Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { Check, CheckCircle2, Play, Sparkles } from 'lucide-react';
import { SourceLogo } from '../shared/SourceLogo';

export const HeroFocusCard: React.FC = () => {
  const { tasks, busy, error, toggleTaskComplete, setSelectedTaskForReason } = useApp();
  const [inFocusSession, setInFocusSession] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completedCard, setCompletedCard] = useState<Task | null>(null);
  const [completionPhase, setCompletionPhase] = useState<'idle' | 'hold' | 'exit' | 'replace'>('idle');

  useEffect(() => {
    if (completionPhase !== 'hold') return;
    // Allow the check to finish appearing, then hold it for two full seconds.
    const holdTimer = window.setTimeout(() => setCompletionPhase('exit'), 2450);
    return () => window.clearTimeout(holdTimer);
  }, [completionPhase]);

  useEffect(() => {
    if (completionPhase !== 'exit') return;
    const exitTimer = window.setTimeout(() => setCompletionPhase('replace'), 300);
    return () => window.clearTimeout(exitTimer);
  }, [completionPhase]);

  useEffect(() => {
    if (completionPhase !== 'replace') return;
    setCompletedCard(null);
    setCompletingTaskId(null);
    setInFocusSession(false);
    setCompletionPhase('idle');
  }, [completionPhase]);

  // The primary focus is the highest-scoring pending task in "now", or the top pending task
  const focusTask = completedCard || tasks.find(t => t.status === 'pending');
  const cardAnimation = completionPhase === 'exit' || completionPhase === 'replace'
    ? 'focus-card-exit' : 'focus-card-enter';

  if (!focusTask) {
    return (
      <div className="focus-card-enter bg-[#121215] border border-[#27272a] rounded-none p-8 text-center text-zinc-400">
        {error && <p role="alert" className="mb-3 text-sm text-rose-400">{error}</p>}
        <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-white">No pending tasks</h3>
        <p className="text-sm text-zinc-500">Import mock feeds to populate your workspace.</p>
      </div>
    );
  }

  return (
    <div key={focusTask.id} className={`relative bg-[#121215] border border-[#27272a] hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/60 transition-all duration-200 rounded-none p-7 shadow-xl shadow-black/40 ${cardAnimation}`}>
      {error && <p role="alert" className="mb-4 text-sm text-rose-400">{error}</p>}
      {/* Simple source header with a right-aligned time estimate */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center">
            <SourceLogo source={focusTask.source} size={36} />
          </div>

          <span className="text-lg font-normal text-zinc-200 leading-snug">
            {focusTask.sourceLabel || (focusTask.source === 'email' ? 'Email from a client' : 'Task')}
          </span>
        </div>

        {/* Time estimate right-aligned */}
        <span className="shrink-0 text-base font-normal text-zinc-400">
          {focusTask.estimatedHours === null ? 'Estimate needed' : `${focusTask.estimatedHours} ${focusTask.estimatedHours === 1 ? 'hour' : 'hours'}`}
        </span>
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
          disabled={completingTaskId !== null}
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
          onClick={() => {
            if (completingTaskId || busy) return;
            const taskId = focusTask.id;
            setCompletedCard(focusTask);
            setCompletingTaskId(taskId);
            setCompletionPhase('hold');
            toggleTaskComplete(taskId);
          }}
          disabled={completingTaskId !== null || busy}
          aria-label={completingTaskId === focusTask.id ? 'Completing task' : 'Complete task'}
          className={`relative h-12 shrink-0 overflow-hidden border text-sm font-medium transition-all duration-300 ease-out motion-reduce:transition-none ${completingTaskId === focusTask.id
            ? 'w-12 rounded-full border-emerald-400 bg-emerald-500 text-white shadow-[0_0_20px_#10b98140]'
            : 'w-32 rounded-none border-zinc-800 bg-[#16161a] hover:bg-[#202026] hover:border-emerald-600/50 hover:text-emerald-300 active:scale-[0.98] text-zinc-200'}`}
        >
          <span className={`absolute inset-0 flex items-center justify-center transition-all duration-150 motion-reduce:transition-none ${completingTaskId === focusTask.id ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}>Complete</span>
          <span aria-hidden="true" className={`absolute inset-0 flex items-center justify-center transition-all duration-300 delay-150 motion-reduce:transition-none ${completingTaskId === focusTask.id ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}><Check className="h-6 w-6" strokeWidth={3} /></span>
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
