import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // Packaged Electron windows load dist/index.html through file://. Relative asset URLs keep
  // scripts, styles, and lazy chunks inside the app archive instead of resolving from /assets.
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(?:react|react-dom|react-i18next|i18next)\//.test(id)) return 'react';
          if (/node_modules\/(?:zustand|idb-keyval)\//.test(id)) return 'state';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
