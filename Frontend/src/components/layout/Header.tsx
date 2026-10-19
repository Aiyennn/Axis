import { RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const { resetToDemoSeed } = useApp();

  return (
    <header className="h-14 border-b border-[#27272a] bg-[#121215]/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/40">
          PROTOTYPE • MOCK INTEGRATIONS
        </span>
        <span className="text-xs text-zinc-500 hidden sm:inline">
          Autonomous Prioritization & Time Allocator
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={resetToDemoSeed}
          title="Reset to original demo seed scenario"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-[#18181b] hover:bg-[#222226] border border-[#27272a] rounded-md transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
          <span>Reset Demo</span>
        </button>

        <div className="h-4 w-[1px] bg-[#27272a] mx-1"></div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-mono text-[11px]">Engine Ready</span>
        </div>
      </div>
    </header>
  );
};

