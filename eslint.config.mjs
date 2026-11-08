// ESLint faz parte do build de novo (next.config.mjs sem ignoreDuringBuilds).
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Estilo livre: o projeto não usa prettier.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'lib/municipios/**', 'lib/municipios-sc.js', 'scripts_gen_icons.js'],
  },
];

export default config;
