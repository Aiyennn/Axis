import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithEsbuild } from 'vite';
import * as icons from '../node_modules/lucide-react/dist/esm/lucide-react.js';

let workspace;
const modules = new Map();
async function load(relativePath) {
  const path = new URL(`../src/${relativePath}`, import.meta.url);
  const { code } = await transformWithEsbuild(await readFile(path, 'utf8'), fileURLToPath(path),
    { loader: relativePath.endsWith('.tsx') ? 'tsx' : 'ts', jsx: 'automatic', format: 'cjs' });
  const compiled = { exports: {} };
  const localRequire = createRequire(path);
  const require = name => {
    if (name === 'lucide-react') return icons;
    if (name.includes('/context/AppContext')) return { useApp: () => workspace };
    if (name.includes('/shared/SourceLogo')) return { SourceLogo: ({ source }) => React.createElement('span', { 'data-source': source }) };
    return modules.get(name) || localRequire(name);
  };
  new Function('require', 'module', 'exports', code)(require, compiled, compiled.exports);
  return compiled.exports;
}
const display = await load('engine/scheduleDisplay.ts');
modules.set('../../engine/scheduleDisplay', display);
modules.set('../../engine/scheduler', await load('engine/scheduler.ts'));
modules.set('./UpcomingSchedule', await load('components/dashboard/UpcomingSchedule.tsx'));
modules.set('./DailyTimeline', await load('components/dashboard/DailyTimeline.tsx'));
const { HeroFocusCard } = await load('components/dashboard/HeroFocusCard.tsx');
const { ComingUpSection } = await load('components/dashboard/ComingUpSection.tsx');
const { LaterSection } = await load('components/dashboard/LaterSection.tsx');
const { TodayScheduleWidget } = await load('components/dashboard/TodayScheduleWidget.tsx');
const { TimelineView } = await load('components/dashboard/TimelineView.tsx');

const exam = { id: 'exam', title: 'CS-401 Midterm Exam Preparation', status: 'pending',
  source: 'canvas', priorityBucket: 'now', deadline: 'Oct 21, 09:00', estimatedHours: 3,
  plannedWork: [{ start: '2026-10-20T09:00:00+08:00', end: '2026-10-20T12:00:00+08:00' }] };
const client = { ...exam, id: 'client', title: 'Client revision', source: 'email', estimatedHours: 2,
  plannedWork: [{ start: '2026-10-20T12:00:00+08:00', end: '2026-10-20T14:00:00+08:00' }] };
const movedExam = { ...exam, priorityBucket: 'next', warnings: ['PROJECTED_DEADLINE_MISS'],
  plannedWork: [{ start: '2026-10-21T01:00:00Z', end: '2026-10-21T04:00:00Z' }] };
function accept(tasks) {
  workspace = { tasks, scheduleTasks: tasks, mockNow: display.DEMO_NOW, calendarEvents: [],
    capacity: {}, setSelectedTaskForReason() {}, setActiveView() {}, toggleTaskComplete() {} };
}
const render = Component => renderToStaticMarkup(React.createElement(Component));

test('accepting a move replaces the focus and moves CS-401 into Tomorrow without losing it', () => {
  accept([exam, client]);
  assert.match(render(HeroFocusCard), /CS-401/);
  // Old saved runs may still return Next first. Display must respect the bucket.
  accept([movedExam, client]);
  assert.doesNotMatch(render(HeroFocusCard), /CS-401/);
  assert.match(render(HeroFocusCard), /Client revision/);
  const upcoming = render(ComingUpSection);
  assert.match(upcoming, /Tomorrow/);
  assert.match(upcoming, /CS-401/);
  assert.match(upcoming, /NEXT · Planned Tomorrow, 9:00 AM/);
  assert.doesNotMatch(upcoming, />Today</);
});

test('calendar and dashboard both retain the moved block with its new day, time, and risk', () => {
  accept([movedExam, client]);
  for (const Component of [TodayScheduleWidget, TimelineView]) {
    const html = render(Component);
    assert.match(html, /Scheduled after today/);
    assert.ok(html.indexOf('CS-401') > html.indexOf('Scheduled after today'));
    assert.match(html, /Tomorrow.*9:00 AM/);
    assert.match(html, /finishes after the deadline/);
  }
});

test('an all-deferred workspace has no Now focus and retains the first task in Upcoming or Later', () => {
  accept([movedExam]);
  assert.match(render(HeroFocusCard), /Nothing to focus on now/);
  assert.match(render(ComingUpSection), /CS-401/);
  accept([{ ...movedExam, priorityBucket: 'later' }]);
  assert.match(render(LaterSection), /CS-401/);
});

test('planned dates use Shanghai time instead of the browser timezone or deadline prose', () => {
  assert.equal(display.scheduleDay('2026-10-20T17:00:00Z'), '2026-10-21');
  assert.equal(display.plannedLabel(movedExam), 'Tomorrow, 9:00 AM');
});
