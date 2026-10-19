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

const LOGO_URLS: Partial<Record<SourceType, string>> = {
  email: gmailLogoUrl,
  canvas: canvasLogoUrl,
  calendar: calendarLogoUrl,
  task: calendarLogoUrl,
};

export const SourceLogo: React.FC<SourceLogoProps> = ({ source, size = 20, className = '' }) => {
  if (source === 'github') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-white shrink-0 ${className}`}
      >
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </svg>
    );
  }

  if (source === 'notion') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`text-zinc-200 shrink-0 ${className}`}
      >
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.197 2.482c-.466.046-.56.28-.373.466zm.793 3.315v13.636c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.12V6.634c0-.56-.233-.84-.7-.793l-15.27.887c-.466.047-.7.28-.7.793zm13.497.607c.047.466-.187.933-.653.98l-.887.093v10.366c-.607.327-1.167.514-1.634.514-.747 0-1.074-.234-1.68-1.027l-5.184-8.125v7.752l1.634.373c.047.42-.373.84-.84.84l-3.362.187c-.047-.42.187-.84.653-.887l1.028-.14V9.108l-1.4-.14c-.047-.42.28-.887.747-.933l3.596-.234 5.37 8.358V8.734l-1.353-.14c-.047-.467.28-.934.747-.98z"/>
      </svg>
    );
  }

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

