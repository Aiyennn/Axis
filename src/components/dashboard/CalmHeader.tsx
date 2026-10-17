import React from 'react';
import { useApp } from '../../context/AppContext';

export const CalmHeader: React.FC = () => {
  const { tasks } = useApp();
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="text-[11px] font-mono tracking-widest text-zinc-500 uppercase font-semibold mb-1">
          SATURDAY, OCTOBER 17
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1.5">
          Let's clear your head.
        </h1>
        <p className="text-sm text-zinc-400">
          You have {pendingCount} responsibilities. You don't need to think about all of them at once.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-[#121215] border border-[#27272a] px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>Engine Ready</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-violet-900/60 border border-violet-700/60 flex items-center justify-center font-bold text-violet-200 text-xs shadow">
          A
        </div>
      </div>
    </div>
  );
};
