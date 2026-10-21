import { useApp } from '../../context/AppContext';
import { generateDailyTimeline, formatHour } from '../../engine/scheduler';
export function TodayScheduleWidget() {
  const { tasks, calendarEvents, setActiveView, setSelectedTaskForReason } = useApp();
  const blocks = generateDailyTimeline(tasks, calendarEvents).filter(b => b.type !== 'open');
  return <section className="border border-zinc-700 p-5 space-y-3">
    <h3>Today's proposed schedule</h3>
    {blocks.length === 0 && <p className="text-sm text-zinc-400">No work blocks yet. Add missing effort estimates to schedule tasks.</p>}
    {blocks.slice(0, 5).map(b => <button className="block text-left text-sm" key={b.id} onClick={() => b.task && setSelectedTaskForReason(b.task)}>{formatHour(b.startHour)}–{formatHour(b.endHour)} · {b.title}</button>)}
    <button className="underline text-sm" onClick={() => setActiveView('timeline')}>Full timeline</button>
  </section>;
}
export default TodayScheduleWidget;
