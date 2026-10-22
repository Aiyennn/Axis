import { AxisLogo } from '../shared/AxisLogo';
import React, { useEffect, useState } from 'react';

interface ChatBubbleProps {
  isOpen: boolean;
  onToggle: () => void;
  hasUnread?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ isOpen, onToggle }) => {
  const [showGreeting, setShowGreeting] = useState(true);
  const [greetingVisible, setGreetingVisible] = useState(false);

  useEffect(() => {
    const appear = window.setTimeout(() => setGreetingVisible(true), 30);
    const disappear = window.setTimeout(() => setGreetingVisible(false), 5000);
    const remove = window.setTimeout(() => setShowGreeting(false), 5300);
    return () => {
      window.clearTimeout(appear);
      window.clearTimeout(disappear);
      window.clearTimeout(remove);
    };
  }, []);

  return (
    <div className="fixed bottom-10 right-10 sm:bottom-12 sm:right-12 z-40 flex items-center gap-2">
      {showGreeting && (
        <div
          role="status"
          className={`absolute bottom-full right-0 mb-4 w-64 max-w-[calc(100vw-5rem)] origin-bottom-right rounded-2xl border border-white/40 bg-[#18181b] px-4 py-3 text-sm leading-relaxed text-zinc-200 shadow-xl transition-all duration-300 ease-out motion-reduce:transition-none ${
            greetingVisible && !isOpen
              ? 'translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none translate-y-2 scale-95 opacity-0'
          }`}
        >
          If you need to ask question, I'm here
          <span aria-hidden="true" className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 border-b border-r border-white/40 bg-[#18181b]" />
        </div>
      )}
      <button
        onClick={onToggle}
        aria-label={isOpen ? 'Close Axis Copilot' : 'Open Axis Copilot'}
        aria-expanded={isOpen}
        className={`group relative flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-200 shadow-2xl active:scale-95 ${
          isOpen
            ? 'bg-[#18181b] border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
            : 'bg-[#121215]/95 hover:bg-[#18181b] border-white/50 hover:border-white text-white shadow-black/40 backdrop-blur-md'
        }`}
      >
        <AxisLogo className="h-6 w-6 text-violet-400 transition-transform group-hover:scale-110" />
      </button>
    </div>
  );
};

export default ChatBubble;

