import React from 'react';
import { useApp } from '../../context/AppContext';
import { calculateCapacity } from '../../engine/scheduler';
import { CheckCircle2, AlertTriangle, Sparkles, LayoutList, Network } from 'lucide-react';

interface CalmHeaderProps {
  dashView: 'list' | 'graph';
  setDashView: (view: 'list' | 'graph') => void;
}

export const CalmHeader: React.FC<CalmHeaderProps> = ({ dashView, setDashView }) => {
  const { tasks, calendarEvents } = useApp();

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const capacity = calculateCapacity(tasks, calendarEvents);

  return (
    <div className="flex flex-col mb-7">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Date + System Status Indicators */}
        <div className="flex items-center gap-5 text-xs font-mono">
          <span className="text-zinc-500 font-semibold tracking-wider uppercase text-sm">
            SATURDAY, OCTOBER 17
          </span>

          {/* Engine Online Pill */}
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-sans text-xs">Engine Online</span>
          </div>

          {/* Schedule Status Indicator */}
          {capacity.isOverloaded ? (
            <div className="flex items-center gap-1.5 text-rose-400">
              <AlertTriangle size={15} />
              <span className="font-sans text-xs font-medium">
                {capacity.deficitHours}h deficit
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={16} />
              <span className="font-sans text-xs font-medium">Schedule looks clear</span>
            </div>
          )}
        </div>

        {/* Right: View Mode Toggle & User Avatar */}
        <div className="flex items-center gap-3">
          {/* List / Graph Toggle Pill with sliding animated active background */}
          <div className="relative flex items-center p-1 rounded-xl bg-[#121215] border border-zinc-800">
            {/* Sliding highlight capsule */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-zinc-800 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm ${
                dashView === 'list' ? 'left-1' : 'left-[calc(50%)]'
              }`}
            />

            <button
              onClick={() => setDashView('list')}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 min-w-[64px] ${
                dashView === 'list' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutList size={13} />
              <span>List</span>
            </button>
            <button
              onClick={() => setDashView('graph')}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 min-w-[64px] ${
                dashView === 'graph' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network size={13} />
              <span>Graph</span>
            </button>
          </div>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
            A
          </div>
        </div>
      </div>

      {/* Main Friendly Greeting */}
      <h1 className="text-3xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
        <span>Welcome back, Ayen. Let's pick up where you left off.</span>
        <Sparkles className="w-6 h-6 text-zinc-300 fill-zinc-300 inline-block" />
      </h1>

      {/* Conversational AI Briefing Paragraph with indentation matching screenshot */}
      <div className="pl-12 flex flex-col">
        <p className="text-sm text-zinc-300 max-w-3xl leading-relaxed font-normal">
          I’ve reviewed your tasks, and you have {activeTasks.length} active right now. One needs your attention first,
          while the others can wait. Take a look below, and let’s tackle them one step at a time! if
          you have question just press this card or the chat bubble on the bottom right corner
        </p>
      </div>
    </div>
  );
};
