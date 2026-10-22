import React from 'react';
import logoUrl from '../../assets/logo.png';

/** Frame the uploaded symbol without its surrounding transparent padding. */
export const AxisLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="300 325 640 650" role="img" aria-label="Axis" {...props}>
    <image href={logoUrl} width="1280" height="1280" />
  </svg>
);
