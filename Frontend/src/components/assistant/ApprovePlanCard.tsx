import React, { useState } from 'react';
import { PlanChangeProposal } from '../../types';
import { Check, X, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

interface ApprovePlanCardProps {
  proposal: PlanChangeProposal;
  onApprove: (proposal: PlanChangeProposal) => void;
  onReject?: () => void;
}

export const ApprovePlanCard: React.FC<ApprovePlanCardProps> = ({
  proposal,
  onApprove,
  onReject,
}) => {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const handleApprove = () => {
    setStatus('approved');
    onApprove(proposal);
  };

  const handleReject = () => {
    setStatus('rejected');
    if (onReject) onReject();
  };

  const bucketLabel = (bucket: string) => {
    switch (bucket) {
      case 'now':
        return 'Do Now';
      case 'next':
        return 'Do Next';
      case 'later':
        return 'Do Later';
      default:
        return bucket;
    }
  };

  return (
    <div className="mt-3 p-4 bg-[#131316] border border-zinc-700/60 rounded-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-zinc-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Proposed Plan Changes
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded">
          Approval Required
        </span>
      </div>

      {/* Proposed Moves */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono text-zinc-400">Proposed Movements:</div>
        {proposal.moves.map((move, idx) => (
          <div
            key={idx}
            className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between gap-2"
          >
            <span className="text-xs font-medium text-white truncate max-w-[200px]">
              {move.taskTitle}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
              <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400">
                {bucketLabel(move.fromBucket)}
              </span>
              <ArrowRight className="w-3 h-3 text-zinc-500" />
              <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded font-semibold">
                {bucketLabel(move.toBucket)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Trade-Offs & Warnings */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>Trade-Offs & Safety Warnings:</span>
        </div>
        <div className="space-y-1 pl-1">
          {proposal.tradeOffs.map((tradeOff, idx) => (
            <p
              key={idx}
              className={`text-xs leading-relaxed ${
                tradeOff.includes('⚠️') ? 'text-amber-300' : 'text-zinc-300'
              }`}
            >
              {tradeOff}
            </p>
          ))}
        </div>
      </div>

      {/* Actions */}
      {status === 'pending' ? (
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={handleApprove}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve Plan Changes</span>
          </button>
          <button
            onClick={handleReject}
            className="flex items-center justify-center gap-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Keep Current</span>
          </button>
        </div>
      ) : status === 'approved' ? (
        <div className="p-2 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-mono flex items-center justify-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>Plan Approved • Dashboard and Timeline Updated</span>
        </div>
      ) : (
        <div className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono flex items-center justify-center gap-1.5">
          <X className="w-3.5 h-3.5" />
          <span>Proposal Declined • Existing Plan Retained</span>
        </div>
      )}
    </div>
  );
};

export default ApprovePlanCard;

