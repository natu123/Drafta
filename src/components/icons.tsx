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


export const IconCursiveD = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8s8-3.58 8-8c0-2.03-.76-3.88-2-5.3M16 4l-4 16"/>
    </svg>
);

export const IconCursiveP = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M8 4v16"/>
        <path d="M8 4h6a5 5 0 0 1 0 10H8"/>
    </svg>
);


export const IconCursiveA = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8s8-3.58 8-8c0-2.03-.76-3.88-2-5.3"/>
        <path d="M17 9a5 5 0 0 0-5-5"/>
    </svg>
);

export const UserIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    'cursive-d': IconCursiveD,
    'cursive-p': IconCursiveP,
    'cursive-a': IconCursiveA,
};
