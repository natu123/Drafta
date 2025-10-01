import * as React from 'react';

export const AppLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g strokeWidth="8" stroke="currentColor" fill="none" strokeLinecap="round">
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
    <circle cx="50" cy="50" r="10" fill="currentColor" />
  </svg>
);


export const IconMonoD = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M9 4v16h6a5 5 0 0 0 5-5V9a5 5 0 0 0-5-5H9z"/>
        <path d="M13 8h-2"/>
        <path d="M13 12h-2"/>
        <path d="M13 16h-2"/>
    </svg>
);

export const IconMonoP = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 4v16"/>
      <path d="M9 4h6a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H9"/>
      <path d="M13 8h-2"/>
    </svg>
);


export const IconMonoA = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 12h16"/>
        <path d="M4 12l6-8h4l6 8"/>
        <path d="M12 4v16"/>
    </svg>
);

export const UserIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    'mono-d': IconMonoD,
    'mono-p': IconMonoP,
    'mono-a': IconMonoA,
};
