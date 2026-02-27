"use client";

import { memo } from "react";

interface InfinityLogoSvgProps
{
  size?: number;
  className?: string;
}

/**
 * Lightweight SVG Infinity Logo for sidebar/nav usage.
 * Does NOT use Three.js/WebGL — just a pure SVG path with teal gradients.
 */
const InfinityLogoSvg = memo( function InfinityLogoSvg ( {
  size = 32,
  className = "",
}: InfinityLogoSvgProps )
{
  return (
    <svg
      width={ size }
      height={ size }
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={ className }
    >
      <defs>
        {/* Main gradient: teal → emerald */ }
        <linearGradient id="inf-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        {/* Secondary glow */ }
        <linearGradient id="inf-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        {/* Outer glow filter */ }
        <filter id="inf-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Infinity knot shape — two intertwined loops with crossing */ }
      <g filter="url(#inf-glow)">
        {/* Back strand (darker, behind the cross) */ }
        <path
          d="M32 32
             C32 24, 24 16, 16 16
             C8 16, 4 22, 4 32
             C4 42, 8 48, 16 48
             C24 48, 32 40, 32 32Z"
          stroke="url(#inf-grad-2)"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M32 32
             C32 40, 40 48, 48 48
             C56 48, 60 42, 60 32
             C60 22, 56 16, 48 16
             C40 16, 32 24, 32 32Z"
          stroke="url(#inf-grad-2)"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* Front strand (brighter, on top) */ }
        <path
          d="M32 32
             C32 24, 40 16, 48 16
             C56 16, 60 22, 60 32
             C60 42, 56 48, 48 48
             C40 48, 32 40, 32 32Z"
          stroke="url(#inf-grad-1)"
          strokeWidth="3.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M32 32
             C32 40, 24 48, 16 48
             C8 48, 4 42, 4 32
             C4 22, 8 16, 16 16
             C24 16, 32 24, 32 32Z"
          stroke="url(#inf-grad-1)"
          strokeWidth="3.8"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
} );

export default InfinityLogoSvg;
