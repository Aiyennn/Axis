/**
 * SourceLogo.tsx
 * Shared component that renders the real integration logo for a given source.
 * Used in HeroFocusCard, ComingUpSection, and LaterSection.
 *
 * Uses the uploaded SVG assets for Gmail, Canvas, and Google Calendar.
 * Falls back to a Lucide icon for 'task' (no logo uploaded).
 */

import React from 'react';
import type { SourceType } from '../../types';

import canvasLogoUrl from '../../assets/canvas-logo-svgrepo-com.svg';
import calendarLogoUrl from '../../assets/google-calendar-svgrepo-com.svg';
import gmailLogoUrl from '../../assets/google-gmail-svgrepo-com.svg';

interface SourceLogoProps {
  source: SourceType;
  /** Size of the logo in px (default 20) */
  size?: number;
  className?: string;
}

const LOGO_URLS: Record<SourceType, string> = {
  email: gmailLogoUrl,
  canvas: canvasLogoUrl,
  calendar: calendarLogoUrl,
  task: calendarLogoUrl,
};

export const SourceLogo: React.FC<SourceLogoProps> = ({ source, size = 20, className = '' }) => {
  const url = LOGO_URLS[source] || calendarLogoUrl;

  return (
    <img
      src={url}
      alt={source}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
};

