// ESLint faz parte do build de novo (next.config.mjs sem ignoreDuringBuilds).
import coreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  ...coreWebVitals,
  {
    rules: {
      // Estilo livre: o projeto não usa prettier.
      'react/no-unescaped-entities': 'off',
      // Regras novas do react-hooks v6: os padrões atuais do app (setState em
      // effect de boot, refs de última leitura) são legados e seguros, mas a
      // migração para os idiomas recomendados é incremental — por isso só
      // warning. Código NOVO deve evitar esses padrões.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'lib/municipios/**', 'lib/municipios-sc.js', 'scripts_gen_icons.js'],
  },
];
