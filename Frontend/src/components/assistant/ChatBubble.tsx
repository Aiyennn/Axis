import React from 'react';
import { Sparkles, X } from 'lucide-react';

interface ChatBubbleProps {
  isOpen: boolean;
  onToggle: () => void;
  hasUnread?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ isOpen, onToggle }) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      <button
        onClick={onToggle}
        aria-label={isOpen ? 'Close Axis Copilot' : 'Open Axis Copilot'}
        className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-none border transition-all duration-200 shadow-2xl active:scale-95 ${
          isOpen
            ? 'bg-[#18181b] border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
            : 'bg-[#121215]/95 hover:bg-[#18181b] border-violet-500/50 hover:border-violet-400 text-white shadow-violet-950/40 backdrop-blur-md'
        }`}
      >
        {isOpen ? (
          <>
            <X className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            <span className="text-xs font-medium tracking-wide">Close Copilot</span>
          </>
        ) : (
          <>
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-400 animate-ping opacity-75" />
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-violet-500" />
            </div>
            <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-white">
              Ask Axis
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-violet-950/80 border border-violet-800/40 text-violet-300 font-mono hidden sm:inline-block">
              AI
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default ChatBubble;

