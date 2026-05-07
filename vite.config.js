import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CAPACITOR=1 produces a build suitable for the Android wrapper:
// relative asset paths and no GitHub Pages basename.
const isCapacitor = process.env.CAPACITOR === '1';

export default defineConfig({
  plugins: [react()],
  base: isCapacitor ? './' : '/SocialPlug/',
  build: {
    outDir: 'dist',
  },
});
