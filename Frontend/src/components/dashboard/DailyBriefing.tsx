import { useApp } from '../../context/AppContext';
export default function DailyBriefing() {
  const { briefing, status, capacitySummary } = useApp();
  return <section className="border border-zinc-700 p-5 mb-6 space-y-2">
    <h3 className="font-semibold">Your briefing · {status === 'ready' ? 'AI explanation' : 'Rule-based explanation'}</h3>
    <p>{briefing.summary || 'Import mock feeds to generate your briefing.'}</p>
    {briefing.tradeOffs?.map((text, i) => <p className="text-sm text-zinc-400" key={i}>{text}</p>)}
    <p className="text-sm text-zinc-400">Known workload: {capacitySummary.knownRemainingHours || 0}h · Unknown estimates: {capacitySummary.unknownEffortTaskCount || 0} · Available today: {(capacitySummary.availableWorkingHoursToday || 0).toFixed(1)}h</p>
  </section>;
}
