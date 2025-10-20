import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'noncreeping-unabatedly-verdell.ngrok-free.dev',
    ],
  },
});


