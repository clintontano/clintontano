// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://clintontano.vercel.app',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 800,
    },
  },
});
