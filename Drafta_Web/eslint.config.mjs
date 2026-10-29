import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts', 'functions/**'],
  },
  ...nextVitals,
  ...nextTypescript,
];

export default eslintConfig;
