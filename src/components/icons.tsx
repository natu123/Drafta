import * as React from 'react';

export const AppLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    fill="#007AFF" // Bright blue color for the square
  >
    <rect width="92" height="92" x="4" y="4" rx="20" ry="20" />
    <g transform="rotate(45 50 50)">
      <rect 
        x="15" 
        y="45" 
        width="70" 
        height="10" 
        rx="5" 
        ry="5" 
        fill="white" // White color for the slash
      />
    </g>
  </svg>
);
