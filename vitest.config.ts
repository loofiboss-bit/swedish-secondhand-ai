import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    testTimeout: 10_000,
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'release/**', 'swedish-secondhand-ai-*/**'],
  },
});
