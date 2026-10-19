import React from 'react';
import { LayoutDashboard, Calendar, Cable, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView } = useApp();

  return (
    <aside className="w-64 bg-[#121215] border-r border-[#27272a] flex flex-col h-screen shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-wider text-base text-white">AXIS</span>
            <span className="block text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Command Center</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 flex-1 flex flex-col gap-1">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'dashboard'
              ? 'bg-[#18181b] text-white border border-[#27272a] shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/50'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${activeView === 'dashboard' ? 'text-zinc-200' : 'text-zinc-500'}`} />
          Dashboard
        </button>

        <button
          onClick={() => setActiveView('timeline')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'timeline'
              ? 'bg-[#18181b] text-white border border-[#27272a] shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/50'
          }`}
        >
          <Calendar className={`w-4 h-4 ${activeView === 'timeline' ? 'text-zinc-200' : 'text-zinc-500'}`} />
          Timeline
        </button>

        <button
          onClick={() => setActiveView('integrations')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeView === 'integrations'
              ? 'bg-[#18181b] text-white border border-[#27272a] shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/50'
          }`}
        >
          <Cable className={`w-4 h-4 ${activeView === 'integrations' ? 'text-zinc-200' : 'text-zinc-500'}`} />
          Integrations
          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>
      </nav>

      {/* Feed Status Box */}
      <div className="p-3 m-3 bg-[#18181b] border border-[#27272a] rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Simulated Feeds</span>
          <span className="text-[10px] text-emerald-400 font-mono">4 Connected</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#27272a] text-zinc-300 font-mono">Gmail</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#27272a] text-zinc-300 font-mono">Canvas</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#27272a] text-zinc-300 font-mono">Cal</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#27272a] text-zinc-300 font-mono">Tracker</span>
        </div>
      </div>
    </aside>
  );
};
