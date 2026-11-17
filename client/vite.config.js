import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow GitHub Codespaces forwarded-port URLs (*.app.github.dev).
    allowedHosts: ['.app.github.dev'],
    // Forward API calls to the Express server during development.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
