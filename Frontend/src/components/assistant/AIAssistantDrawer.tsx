import { AxisLogo } from '../shared/AxisLogo';
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Send, AlertTriangle, Check } from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { chatMessages, sendChatMessage, applyPlanProposal, chatBusy, busy, error, setActiveView } = useApp();
  const [inputText, setInputText] = useState('');
  const [isMounted, setIsMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      return;
    }
    const timeout = window.setTimeout(() => setIsMounted(false), 300);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  if (!isOpen && !isMounted) return null;

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
    <div ref={node => { if (node) node.inert = !isOpen; }} className={`fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end ${isOpen ? 'assistant-backdrop-enter' : 'assistant-backdrop-exit pointer-events-none'}`}>
      <div role="dialog" aria-modal="true" aria-label="Axis assistant" className={`w-full max-w-md bg-[#0d0d0f] border-l border-[#202024] h-full flex flex-col shadow-2xl ${isOpen ? 'assistant-panel-enter' : 'assistant-panel-exit'}`}>
        {/* Drawer Header */}
        <div className="px-4 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="group flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-zinc-400 transition-all duration-300 hover:border-red-400/80 hover:bg-red-500/10 hover:text-red-400 focus-visible:border-red-400 focus-visible:text-red-400 focus-visible:outline-none active:scale-90 motion-reduce:transition-none"
            aria-label="Close Assistant"
          >
            <X className="w-4 h-4 transition-transform duration-300 ease-out group-hover:rotate-90 group-focus-visible:rotate-90 motion-reduce:transition-none motion-reduce:transform-none" />
          </button>
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 pb-10 text-zinc-500">
              <AxisLogo className="w-10 h-10 text-white mb-5" />
              <p className="text-sm font-semibold leading-5 text-zinc-200 max-w-[250px]">Ask Axis anything about your schedule.</p>
              <p className="text-xs leading-5 text-zinc-500 mt-2 max-w-[280px]">
                Ask which task to do next, challenge priorities, or check workload capacity.
              </p>
            </div>
          ) : (
            chatMessages.map(msg => {

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-base leading-relaxed ${
                      msg.sender === 'user'
                        ? 'rounded-br-sm bg-blue-600 text-white'
                        : 'rounded-bl-sm bg-zinc-800 border border-white/10 text-white'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Inline Structured Approve Plan Changes Card if proposal attached */}
                  {msg.proposal && (
                    <div className="mt-3 w-full rounded-xl border border-zinc-700/60 bg-[#131316] p-4 text-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <span className="font-semibold text-zinc-100 text-sm">
                          {msg.proposal.requiresApproval ? 'Review schedule changes' : 'Schedule updated'}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {msg.proposal.requiresApproval ? 'Action Required' : 'Approved'}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-400 text-[11px] font-medium block mb-1">
                          {msg.proposal.moves.length ? (msg.proposal.requiresApproval ? 'Changes' : 'Changes applied') : 'Rebuild focus blocks using current priorities.'}
                        </span>
                        <div className="space-y-1">
                          {msg.proposal.moves.map(m => (
                            <div key={m.taskId} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                              <span className="min-w-0 text-zinc-200 font-medium leading-relaxed">{m.taskTitle}</span>
                              <span className="shrink-0 rounded border border-zinc-700/70 bg-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-300">
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
                              <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-900/30 bg-amber-950/10 p-3 text-xs leading-relaxed text-amber-200/80">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>{warning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.proposal.requiresApproval ? (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            disabled={busy}
                            onClick={() => applyPlanProposal(msg.proposal!)}
                            className="flex-1 rounded-lg bg-zinc-100 py-2.5 text-zinc-950 font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{busy ? 'Rebuilding...' : 'Approve & Rebuild Schedule'}</span>
                          </button>

                          <button
                            onClick={onClose}
                            className="rounded-lg py-2.5 px-3 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 text-xs transition-colors"
                          >
                            Keep Current
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setActiveView('timeline'); onClose(); }}
                          className="w-full rounded-lg bg-zinc-100 py-2.5 text-zinc-950 font-semibold transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">
                          View updated schedule
                        </button>
                      )}
                    </div>
                  )}

                  <span className="text-xs text-zinc-500 mt-1.5 px-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {chatBusy && (
            <div role="status" className="flex w-fit items-center rounded-2xl rounded-bl-sm border border-white/10 bg-zinc-800 px-4 py-3">
              <span className="sr-only">Axis is typing</span>
              <span aria-hidden="true" className="flex h-5 items-center gap-1.5">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3.5 pt-3 pb-1.5">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Suggested Questions :</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickPrompt("What should I focus on first today and why?")}
              disabled={chatBusy}
              className="text-sm text-left px-3 py-2 rounded-xl bg-[#131316] hover:bg-zinc-800 border border-[#222227] text-zinc-300 transition-colors disabled:opacity-50"
            >
              "What should I focus on first?"
            </button>
            <button
              onClick={() => handleQuickPrompt("Do I have enough free capacity today for all my deadlines?")}
              disabled={chatBusy}
              className="text-sm text-left px-3 py-2 rounded-xl bg-[#131316] hover:bg-zinc-800 border border-[#222227] text-zinc-300 transition-colors disabled:opacity-50"
            >
              "Do I have enough capacity today?"
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="px-3.5 pt-2 pb-3 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={chatBusy}
            placeholder={chatBusy ? "Axis is responding..." : "Ask Axis about priorities, deadlines, or capacity..."}
            aria-label="Message Axis"
            className="flex-1 min-w-0 bg-[#131316] border border-[#27272a] focus:border-blue-500 rounded-xl px-3 py-3 text-base text-white placeholder-zinc-600 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || chatBusy}
            className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/80 text-white transition-colors"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

