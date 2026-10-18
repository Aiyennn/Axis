/**
 * GraphView.tsx
 * Radial "orbit" visualization of tasks around the Axis AI copilot.
 *
 * Distance from center:  score 100 (urgent) → closest | score 0 (low) → farthest
 * Node color:            red (urgent) → amber → green (low)
 * Animations:            lines draw in, nodes pulse, cards fade+slide
 * Logos:                 per-source integration icon on each card
 */

import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { Task } from '../../types';

// Real logo assets — imported as URLs by Vite
import canvasLogoUrl from '../../assets/canvas-logo-svgrepo-com.svg';
import calendarLogoUrl from '../../assets/google-calendar-svgrepo-com.svg';
import gmailLogoUrl from '../../assets/google-gmail-svgrepo-com.svg';


// ── Canvas ──────────────────────────────────────────────────────────────────
const W = 920;
const H = 580;
const CX = W / 2;
const CY = H / 2;
const CENTER_R = 46;
const MIN_R = 118;
const MAX_R = 258;
const CARD_W = 178;
const CARD_H = 72;
const ICON_SIZE = 24; // logo square size in card

// ── color helpers ────────────────────────────────────────────────────────────
function lerpHex(c1: string, c2: string, t: number): string {
  const p = (s: string) => [
    parseInt(s.slice(1, 3), 16),
    parseInt(s.slice(3, 5), 16),
    parseInt(s.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = p(c1);
  const [r2, g2, b2] = p(c2);
  return (
    '#' +
    [r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('')
  );
}

function getNodeColor(score: number): string {
  if (score >= 70) return lerpHex('#f97316', '#ef4444', (score - 70) / 30);
  if (score >= 40) return lerpHex('#eab308', '#f97316', (score - 40) / 30);
  return lerpHex('#22c55e', '#eab308', score / 40);
}

function getRadius(score: number): number {
  return MIN_R + ((100 - score) / 100) * (MAX_R - MIN_R);
}

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ── source metadata ──────────────────────────────────────────────────────────
interface SourceMeta {
  label: string;
  /** URL to the real SVG logo, used as <image href> inside the SVG card */
  logoUrl: string | null;
  /** Fallback icon path for sources without a real logo (24×24 viewBox) */
  fallbackPath?: string;
  fallbackFill?: string;
  iconBg: string;
}

const SOURCE_META: Record<string, SourceMeta> = {
  email: {
    label: 'Gmail',
    logoUrl: gmailLogoUrl,
    iconBg: '#1e1410',
  },
  canvas: {
    label: 'Canvas',
    logoUrl: canvasLogoUrl,
    iconBg: '#1e1210',
  },
  calendar: {
    label: 'Google Cal',
    logoUrl: calendarLogoUrl,
    iconBg: '#10141e',
  },
  task: {
    label: 'Tasks',
    logoUrl: calendarLogoUrl,
    iconBg: '#10141e',
  },
};

const BUCKET_LABEL: Record<string, string> = {
  now: 'DO NOW',
  next: 'DO NEXT',
  later: 'LATER',
};

// ── types ────────────────────────────────────────────────────────────────────
interface NodeData {
  task: Task;
  angle: number;
  dotX: number;
  dotY: number;
  cardX: number;
  cardY: number;
  color: string;
  pathLen: number; // approx length for dash animation
}

// ── path length estimator (straight-line approx) ─────────────────────────────
function approxPathLen(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1) * 1.05; // 5% extra for curve
}

// ── component ────────────────────────────────────────────────────────────────
export default function GraphView() {
  const { tasks, setSelectedTaskForReason } = useApp();
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Trigger entrance animation on mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed'),
    [tasks]
  );

  const nodes: NodeData[] = useMemo(() => {
    const sorted = [...activeTasks].sort((a, b) => b.priorityScore - a.priorityScore);
    return sorted.map((task, i) => {
      const angle = (i / sorted.length) * 2 * Math.PI - Math.PI / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const r = getRadius(task.priorityScore);

      const dotX = CX + r * cosA;
      const dotY = CY + r * sinA;

      const extX = dotX + cosA * 22;
      const extY = dotY + sinA * 22;

      let cardX: number;
      let cardY: number;

      if (cosA > 0.25) cardX = extX;
      else if (cosA < -0.25) cardX = extX - CARD_W;
      else cardX = extX - CARD_W / 2;

      if (sinA > 0.25) cardY = extY;
      else if (sinA < -0.25) cardY = extY - CARD_H;
      else cardY = extY - CARD_H / 2;

      const m = 6;
      cardX = Math.max(m, Math.min(W - CARD_W - m, cardX));
      cardY = Math.max(m, Math.min(H - CARD_H - m, cardY));

      const startX = CX + CENTER_R * cosA;
      const startY = CY + CENTER_R * sinA;
      const pathLen = approxPathLen(startX, startY, dotX, dotY);

      return { task, angle, dotX, dotY, cardX, cardY, color: getNodeColor(task.priorityScore), pathLen };
    });
  }, [activeTasks]);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-zinc-800/60"
      style={{ background: '#070709' }}
    >
      {/* ── keyframe styles injected inline ─────────────────────────── */}
      <style>{`
        @keyframes gv-drawLine {
          from { stroke-dashoffset: var(--len); }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes gv-nodeIn {
          from { opacity: 0; transform: scale(0.3); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes gv-cardIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gv-pulse {
          0%, 100% { r: 14; fill-opacity: 0.12; }
          50%       { r: 20; fill-opacity: 0.22; }
        }
        @keyframes gv-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes gv-breathe {
          0%, 100% { stroke-opacity: 0.28; }
          50%       { stroke-opacity: 0.55; }
        }
        .gv-line {
          stroke-dasharray: var(--len);
          stroke-dashoffset: var(--len);
        }
        .gv-line.ready {
          animation: gv-drawLine 0.9s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        .gv-node-dot {
          transform-origin: var(--cx) var(--cy);
          transform-box: fill-box;
        }
        .gv-node-dot.ready {
          animation: gv-nodeIn 0.5s ease-out forwards;
        }
        .gv-card.ready {
          animation: gv-cardIn 0.5s ease-out forwards;
        }
        .gv-halo.ready {
          animation: gv-pulse 3s ease-in-out infinite;
        }
        .gv-outer-ring {
          transform-origin: ${CX}px ${CY}px;
          transform-box: fill-box;
          animation: gv-spin 18s linear infinite;
        }
        .gv-center-ring {
          animation: gv-breathe 2.8s ease-in-out infinite;
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800/40">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Your world, connected to AXIS.
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">All your tasks. One AI. More focus.</p>
        </div>
        <div className="flex items-center gap-5 text-xs">
          {[
            { color: 'bg-rose-500', label: 'Urgent — nearest' },
            { color: 'bg-amber-500', label: 'Moderate' },
            { color: 'bg-emerald-500', label: 'Low — farthest' },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-zinc-400">
              <span className={`w-2 h-2 rounded-full ${item.color} inline-block`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── SVG graph ───────────────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHovered(null)}
        style={{ minHeight: '420px' }}
      >
        <defs>
          <radialGradient id="gv-cGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
            <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>

          <filter id="gv-nodeFx" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="gv-centerFx" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Per-node gradient: violet center → task color at edge */}
          {nodes.map((n) => (
            <linearGradient
              key={`gv-lg-${n.task.id}`}
              id={`gv-lg-${n.task.id}`}
              x1={CX} y1={CY} x2={n.dotX} y2={n.dotY}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0.95" />
            </linearGradient>
          ))}
        </defs>

        {/* Ambient center glow */}
        <circle cx={CX} cy={CY} r={200} fill="url(#gv-cGlow)" />

        {/* Dashed orbit guide rings */}
        {[MIN_R + (MAX_R - MIN_R) * 0.33, MIN_R + (MAX_R - MIN_R) * 0.66].map((r, i) => (
          <circle
            key={i} cx={CX} cy={CY} r={r}
            fill="none" stroke="#27272a" strokeWidth={0.5}
            strokeDasharray="3 9" opacity={0.35}
          />
        ))}

        {/* ── Connecting lines (animated draw-in) ─────────────────── */}
        {nodes.map((n, i) => {
          const startX = CX + CENTER_R * Math.cos(n.angle);
          const startY = CY + CENTER_R * Math.sin(n.angle);
          const dx = n.dotX - startX;
          const dy = n.dotY - startY;
          const len2 = Math.hypot(dx, dy) || 1;
          const cf = 0.18;
          const cpX = (startX + n.dotX) / 2 - (dy / len2) * len2 * cf;
          const cpY = (startY + n.dotY) / 2 + (dx / len2) * len2 * cf;
          const isHov = hovered === n.task.id;

          return (
            <path
              key={`gv-line-${n.task.id}`}
              className={`gv-line${mounted ? ' ready' : ''}`}
              style={{
                '--len': `${n.pathLen}`,
                animationDelay: `${i * 0.12}s`,
              } as React.CSSProperties}
              d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${n.dotX} ${n.dotY}`}
              fill="none"
              stroke={`url(#gv-lg-${n.task.id})`}
              strokeWidth={isHov ? 2.4 : 1.5}
              opacity={isHov ? 1 : 0.65}
            />
          );
        })}

        {/* ── Node dots + halos ────────────────────────────────────── */}
        {nodes.map((n, i) => {
          const isHov = hovered === n.task.id;
          return (
            <g key={`gv-dot-${n.task.id}`}>
              {/* Pulsing halo */}
              <circle
                cx={n.dotX} cy={n.dotY}
                r={isHov ? 20 : 14}
                fill={n.color}
                fillOpacity={isHov ? 0.25 : 0.13}
                className={`gv-halo${mounted ? ' ready' : ''}`}
                style={{ animationDelay: `${i * 0.12 + 0.5}s` } as React.CSSProperties}
              />
              {/* Core dot */}
              <circle
                cx={n.dotX} cy={n.dotY} r={7}
                fill={n.color}
                filter="url(#gv-nodeFx)"
                className={`gv-node-dot${mounted ? ' ready' : ''}`}
                style={{
                  '--cx': `${n.dotX}px`,
                  '--cy': `${n.dotY}px`,
                  animationDelay: `${i * 0.12 + 0.3}s`,
                  opacity: 0,
                } as React.CSSProperties}
              />
            </g>
          );
        })}

        {/* ── Node cards (animated fade+slide) ────────────────────── */}
        {nodes.map((n, i) => {
          const isHov = hovered === n.task.id;
          const bx = n.cardX;
          const by = n.cardY;
          const meta = SOURCE_META[n.task.source] ?? SOURCE_META.task;

          return (
            <g
              key={`gv-card-${n.task.id}`}
              className={`gv-card${mounted ? ' ready' : ''}`}
              style={{
                cursor: 'pointer',
                animationDelay: `${i * 0.12 + 0.5}s`,
                opacity: 0,
              } as React.CSSProperties}
              onMouseEnter={() => setHovered(n.task.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelectedTaskForReason(n.task)}
            >
              {/* Card background */}
              <rect
                x={bx} y={by} width={CARD_W} height={CARD_H} rx={10}
                fill="#111113"
                stroke={n.color}
                strokeWidth={isHov ? 1.6 : 0.8}
                strokeOpacity={isHov ? 0.9 : 0.42}
              />

              {/* Left accent bar */}
              <rect
                x={bx + 1} y={by + 10}
                width={3} height={CARD_H - 20} rx={1.5}
                fill={n.color} fillOpacity={0.8}
              />

              {/* ── Integration logo icon (24×24 rounded square) ── */}
              <rect
                x={bx + 10} y={by + (CARD_H - ICON_SIZE) / 2}
                width={ICON_SIZE} height={ICON_SIZE} rx={6}
                fill={meta.iconBg}
                stroke={n.color} strokeWidth={0.5} strokeOpacity={0.35}
              />
              {meta.logoUrl ? (
                /* Real SVG logo via <image> */
                <image
                  href={meta.logoUrl}
                  x={bx + 10} y={by + (CARD_H - ICON_SIZE) / 2}
                  width={ICON_SIZE} height={ICON_SIZE}
                />
              ) : (
                /* Fallback path for sources without an uploaded logo */
                <g transform={`translate(${bx + 10} ${by + (CARD_H - ICON_SIZE) / 2}) scale(${ICON_SIZE / 24})`}>
                  <path d={meta.fallbackPath ?? ''} fill={meta.fallbackFill ?? '#ffffff'} />
                </g>
              )}

              {/* Task title */}
              <text
                x={bx + 42} y={by + 23}
                fill="white" fontSize={10.5} fontWeight="600"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {trunc(n.task.title, 20)}
              </text>

              {/* Source label · hours */}
              <text
                x={bx + 42} y={by + 37}
                fill="#71717a" fontSize={9}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {meta.label} · {n.task.estimatedHours}h
              </text>

              {/* Bucket label */}
              <text
                x={bx + 42} y={by + 52}
                fill={n.color} fillOpacity={0.8}
                fontSize={8} fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="0.06em"
              >
                {BUCKET_LABEL[n.task.priorityBucket]}
              </text>

              {/* Score pill (right side) */}
              <rect
                x={bx + CARD_W - 38} y={by + CARD_H - 22}
                width={30} height={13} rx={6.5}
                fill={n.color} fillOpacity={0.18}
              />
              <text
                x={bx + CARD_W - 23} y={by + CARD_H - 12}
                fill={n.color} fontSize={8.5} fontWeight="700"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {n.task.priorityScore}
              </text>
            </g>
          );
        })}

        {/* ── AXIS center node ─────────────────────────────────────── */}
        <g>
          {/* Slowly rotating dashed outer ring */}
          <circle
            cx={CX} cy={CY} r={70}
            fill="none" stroke="#7c3aed" strokeWidth={0.6}
            strokeOpacity={0.18} strokeDasharray="6 14"
            className="gv-outer-ring"
          />
          {/* Breathing inner ring */}
          <circle
            cx={CX} cy={CY} r={56}
            fill="none" stroke="#7c3aed" strokeWidth={1}
            strokeOpacity={0.28}
            className="gv-center-ring"
          />
          {/* Main fill circle */}
          <circle
            cx={CX} cy={CY} r={CENTER_R}
            fill="#18181b" stroke="#7c3aed"
            strokeWidth={1.6} strokeOpacity={0.72}
            filter="url(#gv-centerFx)"
          />

          {/* Sparkle */}
          <text x={CX} y={CY - 10} textAnchor="middle" fill="#a78bfa" fontSize={17} fontFamily="system-ui">
            ✦
          </text>
          {/* AXIS */}
          <text
            x={CX} y={CY + 8} textAnchor="middle"
            fill="white" fontSize={14} fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.09em"
          >
            AXIS
          </text>
          {/* Subtitle */}
          <text
            x={CX} y={CY + 22} textAnchor="middle"
            fill="#52525b" fontSize={7.5}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            Your AI Copilot
          </text>
        </g>

        {/* Empty state */}
        {activeTasks.length === 0 && (
          <text
            x={CX} y={CY + 90} textAnchor="middle"
            fill="#52525b" fontSize={12}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            All tasks complete — orbit is clear.
          </text>
        )}
      </svg>
    </div>
  );
}

