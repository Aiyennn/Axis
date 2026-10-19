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
    <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-5 shadow-lg flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1e1e24] border border-[#27272a] flex items-center justify-center shrink-0">
          <Cpu className="w-4 h-4 text-zinc-300" />
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          <span className="font-semibold text-zinc-200">AXIS</span> is automatically prioritizing your tasks based on deadlines, urgency, and availability.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#27272a] text-xs">
        <button
          onClick={handleHowItWorks}
          className="text-zinc-300 hover:text-white font-medium flex items-center gap-1 transition-colors"
        >
          <span>How it works</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenAssistant}
          className="text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
        >
          Open Copilot 💬
        </button>
      </div>
    </div>
  );
};
