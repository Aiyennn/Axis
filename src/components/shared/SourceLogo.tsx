/**
 * SourceLogo.tsx
 * Shared component that renders the real integration logo for a given source.
 * Used in HeroFocusCard, ComingUpSection, and LaterSection.
 *
 * Uses the uploaded SVG assets for Gmail, Canvas, and Google Calendar.
 * Falls back to a Lucide icon for 'task' (no logo uploaded).
 */

import React from 'react';
import { CheckSquare } from 'lucide-react';
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

const LOGO_URLS: Partial<Record<SourceType, string>> = {
  email: gmailLogoUrl,
  canvas: canvasLogoUrl,
  calendar: calendarLogoUrl,
};

export const SourceLogo: React.FC<SourceLogoProps> = ({ source, size = 20, className = '' }) => {
  const url = LOGO_URLS[source];

  if (url) {
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
  }

  // Fallback for 'task' (no real logo uploaded)
  return <CheckSquare size={size} className={`text-emerald-500 ${className}`} />;
};
