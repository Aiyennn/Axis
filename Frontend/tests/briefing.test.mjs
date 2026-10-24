import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithEsbuild } from 'vite';

const path = new URL('../src/components/dashboard/BriefingPanel.tsx', import.meta.url);
const { code } = await transformWithEsbuild(await readFile(path, 'utf8'), fileURLToPath(path),
  { loader: 'tsx', jsx: 'automatic', format: 'cjs' });
const compiled = { exports: {} };
new Function('require', 'module', 'exports', code)(createRequire(path), compiled, compiled.exports);
const { BriefingPanel } = compiled.exports;
const render = (patch = {}) => renderToStaticMarkup(React.createElement(BriefingPanel, {
  briefing: { summary: 'Start with the exam.', tradeOffs: ['One deadline needs attention.'] },
  status: 'ready', aiBriefingsEnabled: true, busy: false, briefingBusy: false,
  error: '', retry() {}, waiting: React.createElement('p', null, 'Preparing AI briefing'), ...patch,
}));

test('ready briefing renders immediately with trade-offs', () => {
  const html = render();
  assert.match(html, /Start with the exam/);
  assert.match(html, /One deadline needs attention/);
  assert.match(html, /AI briefing/);
});

test('interrupted generation shows saved text and recovery instead of endless loading', () => {
  const html = render({ status: 'generating' });
  assert.match(html, /Start with the exam/);
  assert.match(html, /Retry briefing/);
  assert.match(html, /aria-busy="false"/);
  assert.doesNotMatch(html, /Preparing AI briefing/);
});

test('rules mode displays fallback summary without an unusable retry button', () => {
  const html = render({ status: 'fallback', aiBriefingsEnabled: false });
  assert.match(html, /Start with the exam/);
  assert.match(html, /AI briefings are disabled/);
  assert.doesNotMatch(html, /<button/);
});

test('only active briefing request renders waiting and retains saved summary', () => {
  const html = render({ briefingBusy: true });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Preparing AI briefing/);
  assert.match(html, /Start with the exam/);
  assert.doesNotMatch(render({ busy: true }), /Preparing AI briefing/);
});

test('empty summary and failed retry have visible feedback', () => {
  const html = render({ briefing: {}, error: 'Request timed out.' });
  assert.match(html, /Your briefing has not been generated yet/);
  assert.match(html, /Retry briefing/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Request timed out/);
});

test('stale briefing hides obsolete summary and explains how to refresh', () => {
  const html = render({ status: 'stale' });
  // Stale API responses normally contain no briefing; tolerate older responses too.
  assert.doesNotMatch(html, /Start with the exam/);
  assert.doesNotMatch(html, /Retry briefing/);
  assert.match(html, /Refresh priorities/);
});
