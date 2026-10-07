import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['**/*.test.{js,jsx}'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    env: { NEXT_PUBLIC_API_URL: 'http://api.test/api/v1' },
  },
});
