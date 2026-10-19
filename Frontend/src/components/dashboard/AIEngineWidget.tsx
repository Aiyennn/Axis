import React from 'react';
import { Cpu, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AIEngineWidgetProps {
  onOpenAssistant: () => void;
}

export const AIEngineWidget: React.FC<AIEngineWidgetProps> = ({ onOpenAssistant }) => {
  const { setSelectedTaskForReason, tasks } = useApp();

  const handleHowItWorks = () => {
    const focusTask = tasks.find(t => t.priorityBucket === 'now') || tasks[0];
    if (focusTask) {
      setSelectedTaskForReason(focusTask);
    }
  };

  return (
    <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700/80 hover:shadow-xl hover:shadow-black/30 transition-all duration-200 rounded-none p-5 shadow-lg flex flex-col gap-3 group/engine">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-none bg-[#1e1e24] border border-[#27272a] group-hover/engine:border-zinc-700 group-hover/engine:scale-105 flex items-center justify-center shrink-0 transition-all duration-200">
          <Cpu className="w-4 h-4 text-zinc-300 group-hover/engine:text-white transition-colors" />
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed group-hover/engine:text-zinc-300 transition-colors">
          <span className="font-semibold text-zinc-200">AXIS</span> is automatically prioritizing your tasks based on deadlines, urgency, and availability.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#27272a] text-xs">
        <button
          onClick={handleHowItWorks}
          className="text-zinc-300 hover:text-violet-300 hover:translate-x-0.5 font-medium flex items-center gap-1 transition-all duration-150 active:scale-95"
        >
          <span>How it works</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenAssistant}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800/80 px-2 py-1 -my-1 rounded-none font-medium transition-all duration-150 active:scale-95"
        >
          Open Copilot 💬
        </button>
      </div>
    </div>
  );
};

export default AIEngineWidget;
