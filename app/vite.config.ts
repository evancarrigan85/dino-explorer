import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './': the built app works from any folder (a preview link, a sub-path of the live site)
export default defineConfig({ base: './', plugins: [react()], build: { target: 'es2022', chunkSizeWarningLimit: 1600 } });
