import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Même origine que l'API en dev : le cookie JWT passe sans config CORS côté navigateur
    proxy: { '/api': 'http://localhost:4000' },
  },
});
