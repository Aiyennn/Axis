import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';

import { CheckCircle2, AlertTriangle, Sparkles, LayoutList, Network } from 'lucide-react';

interface CalmHeaderProps {
  dashView: 'list' | 'graph';
  setDashView: (view: 'list' | 'graph') => void;
}

// Typewriter hook: types `text` one character at a time after `startDelay` ms.
// Returns { displayed, done }
function useTypewriter(text: string, speed = 28, startDelay = 0) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    const delayTimer = setTimeout(() => {
      const interval = setInterval(() => {
        indexRef.current += 1;
        setDisplayed(text.slice(0, indexRef.current));
        if (indexRef.current >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(delayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return { displayed, done };
}



// Blinking text cursor shown while text is being typed
const Cursor: React.FC = () => (
  <span className="inline-block w-[2px] h-[1em] bg-zinc-300 align-middle ml-0.5 animate-blink-cursor" />
);

export const CalmHeader: React.FC<CalmHeaderProps> = ({ dashView, setDashView }) => {
  const { capacity, user, briefing } = useApp();




  const greeting = `Welcome back, ${user?.name || "there"}.`;
  const aiMessage = briefing.summary || 'Import mock feeds to start prioritizing your tasks.';

  // Phase 1: type greeting (starts immediately)
  const { displayed: greetingDisplayed, done: greetingDone } = useTypewriter(greeting, 30, 300);

  // Phase 2: type AI message (starts only after greeting finishes)
  const [aiStarted, setAiStarted] = useState(false);

  useEffect(() => {
    if (greetingDone && !aiStarted) {
      const t = setTimeout(() => setAiStarted(true), 350);
      return () => clearTimeout(t);
    }
  }, [greetingDone, aiStarted]);

  const { displayed: aiDisplayed, done: aiDone } = useTypewriter(
    aiStarted ? aiMessage : '',
    22,
    0
  );


  return (
    <div className="flex flex-col mb-7">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Date + System Status Indicators */}
        <div className="flex items-center gap-5 text-xs font-mono">
          <span className="text-zinc-500 font-semibold tracking-wider uppercase text-sm">
            TUESDAY, OCTOBER 20
          </span>

          {/* Engine Online Pill */}
          <div className="flex items-center gap-2 text-zinc-300 hover:text-white px-2 py-1 -mx-2 rounded-none hover:bg-zinc-800/40 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-sans text-xs">Engine Online</span>
          </div>

          {/* Schedule Status Indicator */}
          {capacity.isOverloaded ? (
            <div className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 px-2 py-1 -mx-2 rounded-none hover:bg-rose-950/20 transition-colors cursor-default">
              <AlertTriangle size={15} />
              <span className="font-sans text-xs font-medium">
                {capacity.deficitHours}h deficit
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 px-2 py-1 -mx-2 rounded-none hover:bg-emerald-950/20 transition-colors cursor-default">
              <CheckCircle2 size={16} />
              <span className="font-sans text-xs font-medium">Review unknown estimates</span>
            </div>
          )}
        </div>

        {/* Right: View Mode Toggle & User Avatar */}
        <div className="flex items-center gap-3">
          {/* List / Graph Toggle Pill with sliding animated active background */}
          <div className="relative flex items-center p-1 rounded-none bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-colors">
            {/* Sliding highlight capsule */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-none bg-zinc-800 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm ${
                dashView === 'list' ? 'left-1' : 'left-[calc(50%)]'
              }`}
            />

            <button
              onClick={() => setDashView('list')}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-medium transition-all duration-200 min-w-[64px] ${
                dashView === 'list' ? 'text-white' : 'text-zinc-400 hover:text-zinc-100 hover:scale-105'
              }`}
            >
              <LayoutList size={13} />
              <span>List</span>
            </button>
            <button
              onClick={() => setDashView('graph')}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-medium transition-all duration-200 min-w-[64px] ${
                dashView === 'graph' ? 'text-white' : 'text-zinc-400 hover:text-zinc-100 hover:scale-105'
              }`}
            >
              <Network size={13} />
              <span>Graph</span>
            </button>
          </div>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 hover:scale-110 hover:ring-2 hover:ring-violet-400/50 transition-all duration-200 flex items-center justify-center font-bold text-white text-xs shadow-md cursor-pointer shrink-0">
            A
          </div>
        </div>
      </div>

      {/* Main Friendly Greeting — typewriter phase 1 */}
      <h1 className="text-3xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
        <span>
          {greetingDisplayed}
          {!greetingDone && <Cursor />}
        </span>
        {greetingDone && (
          <Sparkles className="w-6 h-6 text-zinc-300 fill-zinc-300 inline-block" />
        )}
      </h1>

      {/* Conversational AI Briefing — typewriter phase 2 */}
      {greetingDone && (
        <div className="pl-12 flex flex-col">
          <p className="text-sm text-zinc-300 max-w-3xl leading-relaxed font-normal">
            {aiDisplayed}
            {/* Keep cursor blinking throughout (during typing and after) */}
            {(aiStarted || aiDone) && <Cursor />}
          </p>
        </div>
      )}
    </div>
  );
};
