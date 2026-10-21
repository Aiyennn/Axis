import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Send, Sparkles, AlertTriangle, Check, Loader2 } from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { chatMessages, sendChatMessage, applyPlanProposal, chatBusy } = useApp();
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || chatBusy) return;
    sendChatMessage(inputText);
    setInputText('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (chatBusy) return;
    sendChatMessage(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-md bg-[#121215] border-l border-[#27272a] h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Axis Copilot</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Priority & Workload AI Assistant</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <Sparkles className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="text-xs font-medium text-zinc-400">Ask Axis anything about your schedule.</p>
              <p className="text-[11px] text-zinc-600 mt-1 max-w-[240px]">
                Ask which task to do next, challenge priorities, or check workload capacity.
              </p>
            </div>
          ) : (
            chatMessages.map(msg => {
              const isOfflineFallback = msg.sender === 'assistant' && msg.text.includes('Oops Axis is not available');
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-none px-4 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-violet-600 text-white'
                        : isOfflineFallback
                        ? 'bg-[#18181b] border border-amber-900/50 text-amber-300'
                        : 'bg-[#18181b] border border-[#27272a] text-zinc-200'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Inline Structured Approve Plan Changes Card if proposal attached */}
                  {msg.proposal && (
                    <div className="mt-3 w-full bg-[#161224] border border-violet-700/60 rounded-none p-4 shadow-xl text-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-violet-900/50 pb-2">
                        <span className="font-bold text-violet-300 uppercase tracking-wider text-[11px]">
                          Approve Plan Changes?
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {msg.proposal.requiresApproval ? 'Action Required' : 'Approved'}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-400 text-[11px] font-medium block mb-1">Proposed Movements:</span>
                        <div className="space-y-1">
                          {msg.proposal.moves.map(m => (
                            <div key={m.taskId} className="flex items-center justify-between bg-[#111019] p-2 rounded-none border border-violet-900/30">
                              <span className="text-zinc-200 font-medium truncate max-w-[200px]">{m.taskTitle}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 bg-violet-950 text-violet-300 border border-violet-800/40">
                                {m.fromBucket.toUpperCase()} → {m.toBucket.toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {msg.proposal.tradeOffs?.length > 0 && (
                        <div>
                          <span className="text-zinc-400 text-[11px] font-medium block mb-1">Trade-offs & Warnings:</span>
                          <div className="space-y-1">
                            {msg.proposal.tradeOffs.map((warning, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-amber-300/90 text-[11px] bg-amber-950/30 border border-amber-900/30 p-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>{warning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.proposal.requiresApproval && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => applyPlanProposal(msg.proposal!)}
                            className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Changes</span>
                          </button>

                          <button
                            onClick={onClose}
                            className="py-2 px-3 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 text-xs transition-colors"
                          >
                            Keep Current
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <span className="text-[10px] text-zinc-600 mt-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {chatBusy && (
            <div className="flex items-center gap-2 p-3 bg-[#18181b] border border-[#27272a] rounded-none w-fit animate-pulse">
              <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
              <span className="text-xs text-zinc-400">Axis is thinking…</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 border-t border-[#27272a] bg-[#0c0c0e]">
          <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider mb-2">Suggested Questions:</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleQuickPrompt("What should I focus on first today and why?")}
              disabled={chatBusy}
              className="text-[11px] text-left px-2.5 py-1.5 bg-[#18181b] hover:bg-violet-950/60 border border-[#27272a] hover:border-violet-700/50 text-zinc-300 hover:text-violet-200 transition-colors disabled:opacity-50"
            >
              "What should I focus on first?"
            </button>
            <button
              onClick={() => handleQuickPrompt("Do I have enough free capacity today for all my deadlines?")}
              disabled={chatBusy}
              className="text-[11px] text-left px-2.5 py-1.5 bg-[#18181b] hover:bg-violet-950/60 border border-[#27272a] hover:border-violet-700/50 text-zinc-300 hover:text-violet-200 transition-colors disabled:opacity-50"
            >
              "Do I have enough capacity today?"
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-[#27272a] flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={chatBusy}
            placeholder={chatBusy ? "Axis is responding..." : "Ask Axis about priorities, deadlines, or capacity..."}
            className="flex-1 bg-[#18181b] border border-[#27272a] focus:border-violet-500 rounded-none px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || chatBusy}
            className="p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors"
            aria-label="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
