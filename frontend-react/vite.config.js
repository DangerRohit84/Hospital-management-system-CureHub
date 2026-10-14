import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CureHub — Vite dev on :5173, backend REST+SOAP on :8086.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
  },
  preview: {
    port: 5173,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
