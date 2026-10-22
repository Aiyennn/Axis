import { AxisLogo } from '../shared/AxisLogo';
/**
 * GraphView.tsx
 * Obsidian-style Force Graph with Interconnected Network Physics:
 *
 * Requirements:
 * 1. Center AXIS node is fully movable/draggable.
 * 2. Elastic Spring Network:
 *    - All nodes are dynamically connected to AXIS with elastic tension.
 *    - When dragging ANY node (or AXIS) too far, tension builds up and smoothly pulls the entire network along!
 * 3. Proximity = Urgency:
 *    - "Do Now" (highest score) tasks orbit closest to AXIS with radiant glowing red halo.
 *    - "Do Next" tasks orbit mid-range with amber glow.
 *    - "Later" tasks orbit outer-range with emerald glow.
 * 4. Separate logo node per task (never stacked into one node).
 * 5. Fluid 60fps physics with zero React re-render latency + fling momentum.
 * 6. Interactive canvas (pan, scroll-to-zoom, reset, click to view AI reasoning).
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { SourceLogo } from '../shared/SourceLogo';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { Task, SourceType } from '../../types';

interface SimulationNode {
  id: string;
  type: 'axis' | 'task';
  task?: Task;
  title: string;
  source?: SourceType;
  sourceLabel?: string;
  priorityBucket: 'now' | 'next' | 'later' | 'axis';
  priorityScore: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetRadius: number;
}

const WIDTH = 1000;
const HEIGHT = 680;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;

export const GraphView: React.FC = () => {
  const { tasks, setSelectedTaskForReason } = useApp();

  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'completed');
  }, [tasks]);

  // Initial node definitions
  const initialNodesData = useMemo(() => {
    const list: SimulationNode[] = [
      {
        id: 'axis-center',
        type: 'axis',
        title: 'AXIS',
        priorityBucket: 'axis',
        priorityScore: 100,
        x: CX,
        y: CY,
        vx: 0,
        vy: 0,
        targetRadius: 0,
      },
    ];

    const total = activeTasks.length || 1;
    activeTasks.forEach((task, idx) => {
      let r = 360;
      if (task.priorityBucket === 'now') {
        r = 160 - ((task.priorityScore - 80) / 20) * 20; // 140px - 160px
      } else if (task.priorityBucket === 'next') {
        r = 255 - ((task.priorityScore - 50) / 40) * 30; // 225px - 255px
      } else {
        r = 360 - (task.priorityScore / 50) * 30; // 330px - 360px
      }

      const angle = (idx / total) * 2 * Math.PI - Math.PI / 2 + (idx % 2 === 0 ? 0.08 : -0.08);
      const initX = CX + Math.cos(angle) * r;
      const initY = CY + Math.sin(angle) * r;

      list.push({
        id: task.id,
        type: 'task',
        task,
        title: task.title,
        source: task.source,
        sourceLabel: task.sourceLabel,
        priorityBucket: task.priorityBucket,
        priorityScore: task.priorityScore,
        x: initX,
        y: initY,
        vx: 0,
        vy: 0,
        targetRadius: r,
      });
    });

    return list;
  }, [activeTasks]);

  // Simulation nodes in ref for locked 60fps performance without React re-render lag
  const nodesRef = useRef<SimulationNode[]>(initialNodesData);

  // SVG DOM Element refs for instant direct coordinate updating
  const nodeElsRef = useRef<Map<string, SVGGElement>>(new Map());
  const lineElsRef = useRef<Map<string, SVGLineElement>>(new Map());
  const axisGlowCircleRef = useRef<SVGCircleElement | null>(null);
  const radarRingsRef = useRef<SVGGElement | null>(null);

  // UI state for reactive hover card
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Canvas Pan & Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Drag tracking refs
  const draggedNodeIdRef = useRef<string | null>(null);
  const isDraggingNodeRef = useRef<boolean>(false);
  const dragStartClientPos = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastMouseMoveTimeRef = useRef(0);
  const mouseVelocityRef = useRef({ vx: 0, vy: 0 });

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Sync initial nodes when task list changes
  useEffect(() => {
    nodesRef.current = initialNodesData;
  }, [initialNodesData]);

  // Screen coordinate to SVG coordinate helper
  const clientToSvgPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;

    return {
      x: (rawX - transformRef.current.x) / transformRef.current.scale,
      y: (rawY - transformRef.current.y) / transformRef.current.scale,
    };
  }, []);

  // 60FPS Obsidian Spring-Network Physics Engine
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const nodes = nodesRef.current;
      const draggedId = draggedNodeIdRef.current;
      const axisNode = nodes.find(n => n.type === 'axis') || nodes[0];

      // 1. Calculate forces for every node
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        if (n1.id === draggedId) continue; // Dragged node follows mouse directly

        let fx = 0;
        let fy = 0;

        if (n1.type === 'axis') {
          // AXIS Center Node Physics:
          // If a task is being dragged far away, it pulls AXIS toward it!
          if (draggedId && draggedId !== 'axis-center') {
            const draggedNode = nodes.find(n => n.id === draggedId);
            if (draggedNode) {
              const dx = draggedNode.x - n1.x;
              const dy = draggedNode.y - n1.y;
              const dist = Math.hypot(dx, dy) || 1;
              const maxLeash = draggedNode.targetRadius * 1.5;

              if (dist > maxLeash) {
                // Dragged task pulls AXIS
                const pull = (dist - maxLeash) * 0.04;
                fx += (dx / dist) * pull;
                fy += (dy / dist) * pull;
              }
            }
          }

          // Gentle spring anchoring AXIS back toward canvas center if not pulled
          const dxToCenter = CX - n1.x;
          const dyToCenter = CY - n1.y;
          fx += dxToCenter * 0.008;
          fy += dyToCenter * 0.008;
        } else {
          // Task Node Physics:
          // Elastic spring tether connecting Task to AXIS
          const dxToAxis = n1.x - axisNode.x;
          const dyToAxis = n1.y - axisNode.y;
          const distToAxis = Math.hypot(dxToAxis, dyToAxis) || 1;

          // Ideal distance is targetRadius
          const distDiff = distToAxis - n1.targetRadius;

          // When pulled beyond max leash, tension sharply increases (Obsidian network pull)
          const leashLimit = n1.targetRadius * 1.45;
          let tetherSpring = 0.015;
          if (distToAxis > leashLimit) {
            tetherSpring = 0.05 + ((distToAxis - leashLimit) / 100) * 0.06;
          }

          fx -= (dxToAxis / distToAxis) * distDiff * tetherSpring;
          fy -= (dyToAxis / distToAxis) * distDiff * tetherSpring;

          // Node-to-node repulsion so tasks don't overlap
          for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            const n2 = nodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const dist = Math.hypot(dx, dy) || 1;
            const preferredDist = n2.type === 'axis' ? 125 : 90;

            if (dist < preferredDist) {
              const repel = ((preferredDist - dist) / dist) * 0.35;
              fx += dx * repel;
              fy += dy * repel;
            }
          }
        }

        // 4. Subtle ambient "floating" wave motion (ultra-slow, glacial ambient drift)
        const time = performance.now() * 0.001;
        const phase = i * 1.6;
        // Glacial floating frequencies (~60-90 second cycle)
        const floatX = Math.sin(time * 0.08 + phase) * 0.010 + Math.cos(time * 0.045 + phase * 0.6) * 0.005;
        const floatY = Math.cos(time * 0.09 + phase) * 0.012 + Math.sin(time * 0.050 + phase * 0.8) * 0.006;

        // Damping for smooth, organic glide
        const damping = 0.86;
        n1.vx = (n1.vx + fx + floatX) * damping;
        n1.vy = (n1.vy + fy + floatY) * damping;

        n1.x += n1.vx;
        n1.y += n1.vy;
      }

      // 2. Direct DOM updates for maximum 60fps performance
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Update node transform
        const gEl = nodeElsRef.current.get(node.id);
        if (gEl) {
          gEl.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        }

        // If it's a task node, update connection line to AXIS
        if (node.type === 'task') {
          const lineEl = lineElsRef.current.get(node.id);
          if (lineEl) {
            lineEl.setAttribute('x1', `${axisNode.x}`);
            lineEl.setAttribute('y1', `${axisNode.y}`);
            lineEl.setAttribute('x2', `${node.x}`);
            lineEl.setAttribute('y2', `${node.y}`);
          }
        }
      }

      // Update AXIS ambient glow circle and concentric rings to follow AXIS position
      if (axisGlowCircleRef.current) {
        axisGlowCircleRef.current.setAttribute('cx', `${axisNode.x}`);
        axisGlowCircleRef.current.setAttribute('cy', `${axisNode.y}`);
      }
      if (radarRingsRef.current) {
        radarRingsRef.current.setAttribute('transform', `translate(${axisNode.x - CX}, ${axisNode.y - CY})`);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Global Pointer Listeners for free dragging
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(now - lastMouseMoveTimeRef.current, 1);
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (draggedNodeIdRef.current) {
        const distMoved = Math.hypot(
          clientX - dragStartClientPos.current.x,
          clientY - dragStartClientPos.current.y
        );
        if (distMoved > 4) {
          isDraggingNodeRef.current = true;
        }

        const pt = clientToSvgPoint(clientX, clientY);
        const node = nodesRef.current.find(n => n.id === draggedNodeIdRef.current);
        if (node) {
          const prevX = node.x;
          const prevY = node.y;

          node.x = pt.x - dragOffsetRef.current.x;
          node.y = pt.y - dragOffsetRef.current.y;

          mouseVelocityRef.current = {
            vx: ((node.x - prevX) / dt) * 16,
            vy: ((node.y - prevY) / dt) * 16,
          };

          // Direct DOM transform update for dragged node
          const gEl = nodeElsRef.current.get(node.id);
          if (gEl) {
            gEl.setAttribute('transform', `translate(${node.x}, ${node.y})`);
          }
        }
      } else if (isPanningRef.current) {
        setTransform(prev => ({
          ...prev,
          x: clientX - panStartRef.current.x,
          y: clientY - panStartRef.current.y,
        }));
      }

      lastMouseMoveTimeRef.current = now;
    };

    const handleGlobalPointerUp = () => {
      if (draggedNodeIdRef.current) {
        const node = nodesRef.current.find(n => n.id === draggedNodeIdRef.current);
        if (node) {
          node.vx = Math.max(Math.min(mouseVelocityRef.current.vx, 22), -22);
          node.vy = Math.max(Math.min(mouseVelocityRef.current.vy, 22), -22);
        }

        draggedNodeIdRef.current = null;
        setTimeout(() => {
          isDraggingNodeRef.current = false;
        }, 120);
      }
      isPanningRef.current = false;
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [clientToSvgPoint]);

  // Pointer Down on ANY Node (Task OR AXIS)
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();

    draggedNodeIdRef.current = nodeId;
    isDraggingNodeRef.current = false;
    dragStartClientPos.current = { x: e.clientX, y: e.clientY };
    lastMouseMoveTimeRef.current = performance.now();
    mouseVelocityRef.current = { vx: 0, vy: 0 };

    const pt = clientToSvgPoint(e.clientX, e.clientY);
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      dragOffsetRef.current = { x: pt.x - node.x, y: pt.y - node.y };
      node.vx = 0;
      node.vy = 0;
    }
  };

  // Canvas Background Panning
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX - transform.x,
      y: e.clientY - transform.y,
    };
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.09 : 0.91;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * zoomFactor, 0.45), 2.5),
    }));
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.22 : 0.82;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * factor, 0.45), 2.5),
    }));
  };

  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
    nodesRef.current.forEach((n, idx) => {
      const init = initialNodesData[idx];
      if (init) {
        n.x = init.x;
        n.y = init.y;
        n.vx = 0;
        n.vy = 0;
      }
    });
  };

  const hoveredTask = useMemo(() => {
    if (!hoveredNodeId || hoveredNodeId === 'axis-center') return null;
    return initialNodesData.find(n => n.id === hoveredNodeId)?.task || null;
  }, [hoveredNodeId, initialNodesData]);

  const axisInitialNode = initialNodesData[0];

  return (
    <div className="relative w-full rounded-none overflow-hidden border border-zinc-800/80 bg-[#09090b] shadow-2xl select-none">
      {/* Top Header Mode Indicator */}
      <div className="absolute top-5 left-6 z-20 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2 py-1.5 text-xs text-zinc-200">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300 shadow-[0_0_10px_#fda4af]" />
          <span className="font-semibold text-white">Proximity = Urgency</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400">{activeTasks.length} Live Nodes</span>
        </div>
        <span className="text-xs text-zinc-500 hidden sm:inline">
          Drag AXIS or tasks • Pulling a node far draws the network along
        </span>
      </div>

      {/* Interactive Controls Overlay (Zoom / Reset) */}
      <div className="absolute top-5 right-6 z-20 flex items-center gap-1.5">
        <button
          onClick={() => handleZoom('in')}
          title="Zoom In"
          className="p-2 rounded-full text-blue-300 hover:text-blue-100 hover:bg-blue-500/20 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => handleZoom('out')}
          title="Zoom Out"
          className="p-2 rounded-full text-blue-300 hover:text-blue-100 hover:bg-blue-500/20 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={handleReset}
          title="Reset Graph"
          className="p-2 rounded-full text-blue-300 hover:text-blue-100 hover:bg-blue-500/20 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-[620px] cursor-grab active:cursor-grabbing block"
        onPointerDown={handleCanvasPointerDown}
        onWheel={handleWheel}
      >
        <defs>
          {/* Violet Glow for AXIS Center */}
          <radialGradient id="axisGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>

          {/* Radiant Red Halo for DO NOW Tasks */}
          <radialGradient id="urgentRedGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>

          {/* Amber Glow for DO NEXT */}
          <radialGradient id="amberGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* High performance glow filter */}
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Global Transform Layer for Pan & Zoom */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Concentric Radar Rings anchored to AXIS center */}
          <g ref={radarRingsRef} opacity="0.4" pointerEvents="none">
            {/* Inner Ring: DO NOW Zone */}
            <circle
              cx={CX}
              cy={CY}
              r={160}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeDasharray="4 6"
              strokeOpacity="0.4"
            />
            {/* Mid Ring: DO NEXT Zone */}
            <circle
              cx={CX}
              cy={CY}
              r={255}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="6 8"
              strokeOpacity="0.3"
            />
            {/* Outer Ring: LATER Zone */}
            <circle
              cx={CX}
              cy={CY}
              r={365}
              fill="none"
              stroke="#10b981"
              strokeWidth="0.8"
              strokeDasharray="8 10"
              strokeOpacity="0.2"
            />
          </g>

          {/* Dynamic Elastic Connection Lines between AXIS and each Task */}
          {initialNodesData.map(node => {
            if (node.type === 'axis') return null;
            const isHovered = hoveredNodeId === node.id;
            const isUrgent = node.priorityBucket === 'now';

            return (
              <line
                key={`line-${node.id}`}
                ref={el => {
                  if (el) lineElsRef.current.set(node.id, el);
                  else lineElsRef.current.delete(node.id);
                }}
                x1={axisInitialNode.x}
                y1={axisInitialNode.y}
                x2={node.x}
                y2={node.y}
                stroke={
                  isHovered
                    ? '#a78bfa'
                    : isUrgent
                    ? '#ef4444'
                    : node.priorityBucket === 'next'
                    ? '#d97706'
                    : '#27272a'
                }
                strokeWidth={isHovered ? 2.5 : isUrgent ? 1.8 : 1}
                strokeOpacity={isHovered ? 0.95 : isUrgent ? 0.75 : 0.45}
                className="pointer-events-none"
              />
            );
          })}

          {/* AXIS Center Radial Ambient Glow */}
          <circle
            ref={axisGlowCircleRef}
            cx={axisInitialNode.x}
            cy={axisInitialNode.y}
            r={150}
            fill="url(#axisGlow)"
            pointerEvents="none"
          />

          {/* AXIS Center Movable Node */}
          <g
            ref={el => {
              if (el) nodeElsRef.current.set('axis-center', el);
              else nodeElsRef.current.delete('axis-center');
            }}
            transform={`translate(${axisInitialNode.x}, ${axisInitialNode.y})`}
            className="cursor-grab active:cursor-grabbing select-none"
            onPointerDown={e => handleNodePointerDown(e, 'axis-center')}
            onMouseEnter={() => setHoveredNodeId('axis-center')}
            onMouseLeave={() => setHoveredNodeId(null)}
          >
            {/* Outer pulsing ring */}
            <circle
              cx={0}
              cy={0}
              r={56}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="1.5"
              strokeOpacity="0.5"
              className="animate-pulse pointer-events-none"
            />

            {/* Solid Center Node Circle */}
            <circle
              cx={0}
              cy={0}
              r={44}
              fill="#121218"
              stroke="#8b5cf6"
              strokeWidth="2.2"
              filter="url(#softGlow)"
            />

            <AxisLogo x={-19} y={-27} width={38} height={38} className="pointer-events-none" />

            {/* AXIS label under logo */}
            <text
              x={0}
              y={18}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={11}
              fontWeight="800"
              letterSpacing="0.18em"
              className="pointer-events-none select-none font-sans"
            >
              AXIS
            </text>
          </g>

          {/* Separate Individual Task Nodes */}
          {initialNodesData.map(node => {
            if (node.type === 'axis') return null;

            const isHovered = hoveredNodeId === node.id;
            const isUrgent = node.priorityBucket === 'now';
            const isNext = node.priorityBucket === 'next';

            const boxBg = isUrgent ? '#1a0e10' : isNext ? '#16130e' : '#121216';
            const borderColor = isHovered
              ? '#a78bfa'
              : isUrgent
              ? '#ef4444'
              : isNext
              ? '#f59e0b'
              : '#2a2a32';

            const boxSize = isUrgent ? 58 : 50;
            const halfSize = boxSize / 2;

            return (
              <g
                key={node.id}
                ref={el => {
                  if (el) nodeElsRef.current.set(node.id, el);
                  else nodeElsRef.current.delete(node.id);
                }}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-grab active:cursor-grabbing select-none"
                onPointerDown={e => handleNodePointerDown(e, node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => {
                  if (!isDraggingNodeRef.current && node.task) {
                    setSelectedTaskForReason(node.task);
                  }
                }}
              >
                {/* Glowing red halo if task is urgent (DO NOW) */}
                {isUrgent && (
                  <circle
                    cx={0}
                    cy={0}
                    r={50}
                    fill="url(#urgentRedGlow)"
                    className="pointer-events-none animate-pulse"
                  />
                )}

                {/* Warm amber aura for DO NEXT */}
                {isNext && (
                  <circle
                    cx={0}
                    cy={0}
                    r={36}
                    fill="url(#amberGlow)"
                    className="pointer-events-none opacity-80"
                  />
                )}

                {/* Squircle Node Container */}
                <rect
                  x={-halfSize}
                  y={-halfSize}
                  width={boxSize}
                  height={boxSize}
                  rx={16}
                  fill={boxBg}
                  stroke={borderColor}
                  strokeWidth={isHovered ? 2.5 : isUrgent ? 2 : 1.2}
                />

                {/* Integration Logo Centered */}
                <foreignObject
                  x={-halfSize}
                  y={-halfSize}
                  width={boxSize}
                  height={boxSize}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="w-full h-full flex items-center justify-center p-2">
                    {node.source && (
                      <SourceLogo
                        source={node.source}
                        size={isUrgent ? 28 : 24}
                        className="pointer-events-none"
                      />
                    )}
                  </div>
                </foreignObject>

                {/* Urgent indicator badge on top-right corner */}
                {isUrgent && (
                  <g transform={`translate(${halfSize - 3}, ${-halfSize + 3})`} className="pointer-events-none">
                    <circle cx={0} cy={0} r={5} fill="#ef4444" />
                    <circle cx={0} cy={0} r={8} fill="none" stroke="#ef4444" strokeWidth="1" className="animate-ping" />
                  </g>
                )}

                {/* Source Label & Task Title below node */}
                <g transform={`translate(0, ${halfSize + 14})`} className="pointer-events-none">
                  {/* Source Name */}
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    fill={isUrgent ? '#f87171' : isHovered ? '#ffffff' : '#e4e4e7'}
                    fontSize={11}
                    fontWeight="700"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {node.sourceLabel || (node.source ? node.source.toUpperCase() : 'Task')}
                  </text>

                  {/* Truncated Task Title */}
                  <text
                    x={0}
                    y={13}
                    textAnchor="middle"
                    fill={isUrgent ? '#fca5a5' : '#a1a1aa'}
                    fontSize={9.5}
                    fontWeight="500"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {node.title.length > 20 ? node.title.slice(0, 18) + '…' : node.title}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Hover Card for inspecting task details */}
      {hoveredTask && (
        <div
          className="absolute bottom-6 left-6 z-30 max-w-sm p-4 rounded-none bg-[#121215]/95 backdrop-blur-xl border border-zinc-700/80 shadow-2xl shadow-black/80 animate-fade-scale cursor-pointer"
          onClick={() => setSelectedTaskForReason(hoveredTask)}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <SourceLogo source={hoveredTask.source} size={18} />
              <span className="text-xs font-semibold text-white">
                {hoveredTask.sourceLabel || hoveredTask.source}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                hoveredTask.priorityBucket === 'now'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : hoveredTask.priorityBucket === 'next'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              Score: {hoveredTask.priorityScore} • {hoveredTask.priorityBucket}
            </span>
          </div>

          <p className="text-xs font-medium text-zinc-200 line-clamp-2 mb-1.5">
            {hoveredTask.title}
          </p>

          <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3">
            {hoveredTask.reasoning}
          </p>

          <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-800">
            <span>Due {hoveredTask.deadline}</span>
            <span className="text-violet-400 font-medium flex items-center gap-1">
              Click to view AI reasoning →
            </span>
          </div>
        </div>
      )}

      {/* Bottom Right Legend */}
      <div className="absolute bottom-5 right-6 z-20 flex items-center gap-4 py-2 text-xs text-zinc-200">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300 shadow-[0_0_10px_#fda4af]" />
          <span className="text-zinc-200 font-medium">Do Now (Closest)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_#fcd34d]" />
          <span className="text-zinc-300">Do Next</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" />
          <span className="text-zinc-200">Later (Outer)</span>
        </div>
      </div>
    </div>
  );
};

export default GraphView;

