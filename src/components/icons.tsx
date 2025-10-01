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


export const IconConstellation1 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M5 12l-2-2 2-2" />
        <path d="M19 12l2-2-2-2" />
        <path d="M12 5l-2-2 2-2" />
        <path d="M12 19l-2 2 2 2" />
        <circle cx="12" cy="12" r="1" />
        <path d="M3 10v4" />
        <path d="M21 10v4" />
        <path d="M10 3h4" />
        <path d="M10 21h4" />
    </svg>
);

export const IconConstellation2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="5" cy="5" r="1" />
        <circle cx="19" cy="5" r="1" />
        <circle cx="5" cy="19" r="1" />
        <circle cx="19" cy="19" r="1" />
    </svg>
);


export const IconConstellation3 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M6 6l12 12" />
        <path d="M6 18L18 6" />
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="18" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="12" cy="12" r="1" />
    </svg>
);

export const UserIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    'constellation1': IconConstellation1,
    'constellation2': IconConstellation2,
    'constellation3': IconConstellation3,
};
