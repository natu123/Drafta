import * as React from 'react';

export const AppLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <g fill="#EDE200">
            <path d="M50 0L61.2 38.8L100 50L61.2 61.2L50 100L38.8 61.2L0 50L38.8 38.8Z" />
        </g>
    </svg>
);
