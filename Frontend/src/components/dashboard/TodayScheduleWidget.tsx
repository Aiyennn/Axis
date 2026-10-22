import { useApp } from '../../context/AppContext';
import { generateDailyTimeline, formatHour } from '../../engine/scheduler';
import { Check, ArrowUpRight } from 'lucide-react';
import { SourceLogo } from '../shared/SourceLogo';
export function TodayScheduleWidget() {
  const { scheduleTasks, calendarEvents, setActiveView, setSelectedTaskForReason } = useApp();
  const blocks = generateDailyTimeline(scheduleTasks, calendarEvents).filter(b => b.type !== 'open');
  return <section className="bg-[#121215] border border-[#27272a] hover:border-zinc-700/80 hover:shadow-xl hover:shadow-black/30 transition-all duration-200 rounded-none p-5 shadow-lg">
    <h3 className="text-sm font-bold tracking-tight text-white mb-4">Today's proposed schedule</h3>
    {blocks.length === 0 && <p className="text-sm text-zinc-400">No work blocks yet. Add missing effort estimates to schedule tasks.</p>}
    <ol className="space-y-0">
      {blocks.slice(0, 5).map((b, index, visibleBlocks) => (
        <li key={b.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < visibleBlocks.length - 1 && <span aria-hidden="true" className="absolute left-[9px] top-5 bottom-0 w-px bg-zinc-800" />}
          <span aria-label={b.task?.status === 'completed' ? 'Completed' : 'Scheduled'} className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 motion-reduce:transition-none ${b.task?.status === 'completed' ? 'border-emerald-400/40 bg-emerald-500 text-white' : 'border-zinc-600 bg-[#121215]'}`}>
            {b.task?.status === 'completed' ? <Check size={12} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-xs tracking-wide text-zinc-400 mb-2">{formatHour(b.startHour)} – {formatHour(b.endHour)}</p>
            <button
              className="flex items-center gap-3 text-left text-sm font-medium leading-snug text-zinc-100 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm"
              onClick={() => b.task ? setSelectedTaskForReason(b.task) : setActiveView('timeline')}
            >
              <SourceLogo source={b.task?.source || 'calendar'} size={26} className="shrink-0" />
              <span>{b.title}</span>
            </button>
          </div>
        </li>
      ))}
    </ol>
    <button className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-300 transition-colors" onClick={() => setActiveView('timeline')}>Full timeline <ArrowUpRight size={13} /></button>
  </section>;
}
export default TodayScheduleWidget;
