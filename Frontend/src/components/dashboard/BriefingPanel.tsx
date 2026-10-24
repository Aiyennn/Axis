import type { ReactNode } from 'react';
import type { Workspace } from '../../services/api';

interface BriefingPanelProps {
  briefing: Workspace['briefing'];
  status: string;
  aiBriefingsEnabled?: boolean;
  busy: boolean;
  briefingBusy: boolean;
  error: string;
  retry: () => unknown;
  waiting: ReactNode;
}

export function BriefingPanel({ briefing, status, aiBriefingsEnabled, busy,
  briefingBusy, error, retry, waiting }: BriefingPanelProps) {
  const summary = briefing.summary?.trim();
  const canRetry = status !== 'empty' && status !== 'stale' && aiBriefingsEnabled !== false;

  return <section aria-label="Daily briefing" aria-busy={briefingBusy} className="flex flex-col items-start gap-2">
    {summary && status !== 'stale' && <>
      <p className="text-xs text-zinc-500">{status === 'ready' ? 'AI briefing' : 'Task briefing'}</p>
      <p className="text-sm text-zinc-300 max-w-3xl leading-relaxed">{summary}</p>
      {briefing.tradeOffs?.map((text, i) => (
        <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed" key={i}>{text}</p>
      ))}
    </>}
    {briefingBusy ? waiting : <>
      {status === 'generating' && <p role="status" className="text-sm text-zinc-400">
        {aiBriefingsEnabled === false ? 'AI briefings are disabled. Showing your saved task briefing.' :
          'The previous AI briefing request has not finished. You can retry it.'}
      </p>}
      {status === 'fallback' && <p role="status" className="text-xs text-zinc-500">
        {aiBriefingsEnabled === false ? 'AI briefings are disabled. Showing your task briefing.' :
          summary ? 'AI briefing unavailable. You can retry; your task briefing is shown above.' :
          'AI briefing unavailable. You can retry.'}
      </p>}
      {(!summary || status === 'stale') && status !== 'generating' && <p role="status" className="text-sm text-zinc-400">
        {status === 'empty' ? 'Import tasks to prepare your briefing.' : status === 'stale' ?
          'Your tasks have changed. Refresh priorities to prepare a new briefing.' :
          'Your briefing has not been generated yet.'}
      </p>}
      {canRetry && (status !== 'ready' || !summary) && (
        <button type="button" onClick={() => void retry()} disabled={busy || briefingBusy}
          className="px-3 py-2 text-sm text-zinc-200 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-50 transition-colors">
          {status === 'pending' ? 'Generate briefing' : 'Retry briefing'}
        </button>
      )}
    </>}
    {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
  </section>;
}
