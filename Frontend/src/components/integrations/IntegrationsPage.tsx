import { useState } from 'react';
import { ChevronDown, Info, Play, RefreshCw, ListTodo } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SourceLogo } from '../shared/SourceLogo';
import type { MockIntegration } from '../../services/api';
import type { SourceType } from '../../types';

const feeds: { id: MockIntegration; source: SourceType; name: string; description: string; details: string }[] = [
  { id: 'canvas', source: 'canvas', name: 'Canvas Portal', description: 'Assignments, grades, course information, announcements, and student activity data from Canvas.', details: 'Replays bundled Canvas assignment fixtures through validation and priority ranking.' },
  { id: 'google_calendar', source: 'calendar', name: 'Google Calendar', description: 'Events, schedules, meeting details, and calendar fixtures from Google Calendar.', details: 'Imports mock calendar events to calculate available time and plan your schedule.' },
  { id: 'gmail', source: 'email', name: 'Gmail', description: 'Email conversations, requests, and follow-up tasks from Gmail.', details: 'Extracts actionable tasks from bundled email fixtures using the configured extraction mode.' },
  { id: 'github', source: 'github', name: 'GitHub', description: 'Issues, development tasks, and project updates from GitHub.', details: 'Imports bundled issue fixtures with source evidence and deadline information.' },
  { id: 'notion', source: 'notion', name: 'Notion', description: 'Project pages, notes, and action items from Notion.', details: 'Turns bundled Notion fixtures into validated tasks with saved source evidence.' },
  { id: 'manual', source: 'task', name: 'Personal Tasks', description: 'Personal to-dos, deadlines, and effort estimates for your day.', details: 'Imports structured personal task fixtures alongside your selected integration feeds.' },
];

export function IntegrationsPage() {
  const { syncMock, busy, error, importResult } = useApp();
  const [selected, setSelected] = useState<MockIntegration[]>(feeds.map(feed => feed.id));
  const [expanded, setExpanded] = useState<MockIntegration[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const run = async () => {
    setHasRun(false);
    await syncMock(selected);
    setHasRun(true);
  };
  return (
    <section className="rounded-none border border-[#252630] bg-[#101115] p-5 sm:p-8 space-y-7 animate-fade-scale" aria-labelledby="integrations-title">
      <header className="flex gap-5 items-start">
        <div>
          <h1 id="integrations-title" className="text-2xl font-bold tracking-tight mb-2">Mock Integration Feeds</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-4xl">Generate realistic mock data from popular integrations. Selected integrations will be included in the mock data with normalisation, validation, storage, priority ranking, and AI explanations. No live accounts are connected.</p>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap justify-between gap-3 text-sm items-center">
          <p className="text-zinc-400" aria-live="polite"><span className="text-violet-300 font-semibold">{selected.length} of {feeds.length}</span> integrations selected</p>
          <button type="button" disabled={busy} onClick={() => setSelected(selected.length === feeds.length ? [] : feeds.map(feed => feed.id))} className="text-violet-300 hover:text-violet-200 disabled:opacity-50">{selected.length === feeds.length ? 'Deselect all' : 'Select all'}</button>
        </div>
        {feeds.map(feed => {
          const enabled = selected.includes(feed.id);
          const open = expanded.includes(feed.id);
          return (
            <article key={feed.id} className="rounded-none border border-[#272833] bg-gradient-to-br from-[#15161c] to-[#111217] overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 sm:gap-5 p-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center ">
                  {feed.id === 'manual' ? <ListTodo className="h-9 w-9 text-violet-300" /> : <SourceLogo source={feed.source} size={42} />}
                </div>
                <div className="flex-1 min-w-[180px]"><h2 className="text-lg font-semibold mb-1">{feed.name}</h2><p className="text-sm text-zinc-400 leading-relaxed">{feed.description}</p></div>
                <div className="flex items-center gap-4 ml-auto">
                  <label className={`flex items-center gap-3 text-sm text-zinc-300 ${busy ? 'opacity-50' : 'cursor-pointer'}`}>
                    <input type="checkbox" role="switch" aria-label={`Include ${feed.name} in mock`} checked={enabled} disabled={busy} onChange={() => { setHasRun(false); setSelected(previous => enabled ? previous.filter(id => id !== feed.id) : [...previous, feed.id]); }} className="peer sr-only" />
                    <span className={`relative h-7 w-12 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-violet-300 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#111217] ${enabled ? 'bg-violet-600' : 'bg-zinc-700'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} /></span>
                    Include in mock
                  </label>
                  <button type="button" aria-label={`${open ? 'Hide' : 'Show'} ${feed.name} details`} aria-expanded={open} aria-controls={`details-${feed.id}`} onClick={() => setExpanded(previous => open ? previous.filter(id => id !== feed.id) : [...previous, feed.id])} className="p-2 text-zinc-400 hover:text-white rounded-none focus-visible:outline-violet-400"><ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} /></button>
                </div>
              </div>
              {open && <p id={`details-${feed.id}`} className="border-t border-[#272833] px-5 py-4 text-sm text-zinc-400">{feed.details} Previously imported tasks and your edits are preserved when this feed is switched off.</p>}
            </article>
          );
        })}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4  p-4 text-violet-300 flex-1 min-w-[240px]">
          <Info className="h-6 w-6 shrink-0" /><div className="text-sm"><p className="font-semibold mb-1">These are mock integrations</p><p>No live accounts are connected. All data is simulated and safe to use.</p></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={run} disabled={busy || !selected.length} className="inline-flex items-center justify-center gap-2 rounded-none border border-zinc-600 px-5 py-4 text-sm font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"><RefreshCw className={`h-5 w-5 ${busy ? 'animate-spin' : ''}`} />RESYNC</button>
          <button type="button" onClick={run} disabled={busy || !selected.length} className="inline-flex items-center justify-center gap-2 rounded-none bg-violet-600 px-5 py-4 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"><Play className="h-5 w-5" />{busy ? 'RUNNING MOCK INTEGRATIONS…' : 'RUN MOCK INTEGRATIONS'}</button>
        </div>
      </footer>
      {!selected.length && <p className="text-sm text-zinc-400">Select at least one integration to run a test.</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {hasRun && !error && importResult && <p role="status" className="text-sm text-violet-300">Mock run complete: {importResult.created} tasks imported, {importResult.revised} revised, {importResult.unchanged} unchanged.{importResult.issues.length > 0 && ` ${importResult.issues.length} records reported issues.`}</p>}
    </section>
  );
}
