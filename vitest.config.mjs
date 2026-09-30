import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    // jsdom para os testes de componente; as libs puras rodam igual em node.
    environment: 'jsdom',
    setupFiles: ['./components/test-setup.js'],
    include: ['lib/**/*.test.js', 'components/**/*.test.jsx'],
  },
});
