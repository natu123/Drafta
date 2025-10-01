import * as React from 'react';

export const AppLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g strokeWidth="8" stroke="hsl(var(--accent))" fill="none" strokeLinecap="round">
      <ellipse cx="50" cy="50" rx="45" ry="18" />
      <ellipse
        cx="50"
        cy="50"
        rx="45"
        ry="18"
        transform="rotate(60 50 50)"
      />
      <ellipse
        cx="50"
        cy="50"
        rx="45"
        ry="18"
        transform="rotate(120 50 50)"
      />
    </g>
    <circle cx="50" cy="50" r="10" fill="hsl(var(--accent))" />
  </svg>
);
