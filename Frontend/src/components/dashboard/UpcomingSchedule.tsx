import { useApp } from '../../context/AppContext';
import { scheduleDayLabel, scheduleTime, upcomingWork } from '../../engine/scheduleDisplay';
import { SourceLogo } from '../shared/SourceLogo';

export function UpcomingSchedule() {
  const { tasks, mockNow, setSelectedTaskForReason } = useApp();
  const work = upcomingWork(tasks, mockNow);
  if (!work.length) return null;
  return <section aria-label="Work scheduled after today" className="mt-5 pt-4 border-t border-zinc-800">
    <h3 className="text-sm font-semibold text-zinc-200 mb-3">Scheduled after today</h3>
    <ol className="space-y-4">
      {work.map(block => <li key={block.id}>
        <p className="text-xs text-zinc-400 mb-1.5">
          {scheduleDayLabel(block.start, mockNow)} · {scheduleTime(block.start)} – {scheduleTime(block.end)}
        </p>
        <button onClick={() => setSelectedTaskForReason(block.task)} className="flex items-center gap-2 text-left text-sm text-zinc-100 hover:text-blue-300">
          <SourceLogo source={block.task.source} size={22} />
          <span>{block.task.title}</span>
          <span className="text-[10px] uppercase text-amber-300">{block.task.priorityBucket}</span>
        </button>
        {block.task.warnings?.includes('PROJECTED_DEADLINE_MISS') &&
          <p className="text-xs text-amber-300 mt-1">This block finishes after the deadline.</p>}
      </li>)}
    </ol>
  </section>;
}
