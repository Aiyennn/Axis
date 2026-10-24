import React, { useState } from 'react';
import { Clock, Calendar, Sparkles, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateDailyTimeline, DAY_START_HOUR, DAY_END_HOUR, TOTAL_DAY_HOURS, formatHour, TimelineBlock } from '../../engine/scheduler';
import { SourceLogo } from '../shared/SourceLogo';

export const DailyTimeline: React.FC = () => {
  const { tasks, calendarEvents, setSelectedTaskForReason } = useApp();
  const [hoveredBlock, setHoveredBlock] = useState<TimelineBlock | null>(null);
  const blocks = generateDailyTimeline(tasks, calendarEvents);
  const currentDemoHour = 8;
  const currentHourPercent = Math.max(0, Math.min(100, ((currentDemoHour - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100));
  const hourTicks = Array.from({ length: TOTAL_DAY_HOURS + 1 }, (_, i) => DAY_START_HOUR + i);
  const focusCount = blocks.filter(block => block.type === 'focus').length;
  const eventCount = blocks.filter(block => block.type === 'event').length;
  const openHours = blocks.filter(block => block.type === 'open').reduce((total, block) => total + block.durationHours, 0);

  return (
    <section className="daily-timeline" aria-label="Interactive daily timeline">
      <div className="daily-timeline-header">
        <Clock className="daily-timeline-clock" strokeWidth={1.5} aria-hidden="true" />
        <div className="daily-timeline-heading">
          <div className="daily-timeline-title">
            <h2>Interactive Daily Timeline</h2>
            <span className="daily-timeline-range">{formatHour(DAY_START_HOUR)} – {formatHour(DAY_END_HOUR)}</span>
            <span className="daily-timeline-engine"><Sparkles size={11} /> Engine proposals</span>
          </div>
          <p>Fixed calendar commitments blocked out · Urgent focus blocks slotted into open intervals without overlap.</p>
        </div>
        <div className="daily-timeline-legend" aria-label="Timeline legend">
          <span><i className="legend-focus" />Proposed focus block</span>
          <span><i className="legend-event" />Fixed Calendar</span>
          <span><i className="legend-open" />Open Time</span>
          <span className="legend-now"><i />Now (08:00 AM)</span>
        </div>
      </div>

      <div className="daily-timeline-scroll" tabIndex={0} aria-label="Schedule from 9 AM to 6 PM">
        <div className="daily-timeline-canvas">
          <div className="daily-timeline-ticks" aria-hidden="true">
            {hourTicks.map(hour => (
              <div key={hour} className={`daily-timeline-tick ${hour === 12 ? 'is-noon' : ''}`} style={{ left: `${((hour - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100}%` }}>
                <span>{formatHour(hour).replace(':00', '')}</span><i />
              </div>
            ))}
          </div>
          <div className="daily-timeline-track">
            {blocks.map(block => {
              const position = { left: `${((block.startHour - DAY_START_HOUR) / TOTAL_DAY_HOURS) * 100}%`, width: `${(block.durationHours / TOTAL_DAY_HOURS) * 100}%` };
              const description = `${block.title}, ${formatHour(block.startHour)} to ${formatHour(block.endHour)}, ${block.durationHours} hours`;
              const interactions = {
                onMouseEnter: () => setHoveredBlock(block),
                onMouseLeave: () => setHoveredBlock(null),
                onFocus: () => setHoveredBlock(block),
                onBlur: () => setHoveredBlock(null),
              };
              if (block.type === 'open') return (
                <div key={block.id} style={position} className="timeline-block timeline-block-open" aria-label={description} {...interactions}>
                  <span>Open Window ({block.durationHours}h)</span>
                </div>
              );
              const content = <>
                <span className="timeline-block-title">
                  {block.task ? <SourceLogo source={block.task.source} size={13} /> : <Calendar size={13} />}
                  <span>{block.title}</span>
                </span>
                <span className="timeline-block-footer">
                  {block.durationHours >= 1 && <span className="timeline-block-time">{formatHour(block.startHour)} – {formatHour(block.endHour)}</span>}
                  <span className="timeline-block-badge">{block.type === 'focus' ? `${block.durationHours}h Focus` : 'Fixed'}</span>
                </span>
              </>;
              return block.type === 'focus' ? (
                <button key={block.id} type="button" style={position} className="timeline-block timeline-block-focus" aria-label={`${description}. View priority rationale`} onClick={() => block.task && setSelectedTaskForReason(block.task)} {...interactions}>{content}</button>
              ) : (
                <div key={block.id} style={position} className="timeline-block timeline-block-event" aria-label={description} {...interactions}>{content}</div>
              );
            })}
            <div className="timeline-now-marker" style={{ left: `max(10px, ${currentHourPercent}%)` }} aria-label="Mock clock: 8 AM, before the workday">
              <span>NOW<br />8:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="daily-timeline-summary" aria-live="polite">
        <p>{hoveredBlock ? <><span>{formatHour(hoveredBlock.startHour)} – {formatHour(hoveredBlock.endHour)}:</span> {hoveredBlock.title} ({hoveredBlock.durationHours}h)</> : <><span>Summary:</span> {eventCount} fixed commitments · {focusCount} focus sessions allocated · {openHours.toFixed(1)}h open time</>}</p>
        <span className="daily-timeline-hint">Click any focus block to view priority rationale <ChevronRight size={11} /></span>
      </div>
    </section>
  );
};

export default DailyTimeline;
