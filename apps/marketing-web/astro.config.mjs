import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  vite: {
    ssr: {
      external: ['@workspace/db', '@prisma/client', '.prisma/client', '@prisma/engines']
    },
    resolve: {
      alias: {
        'cookie': path.resolve('./cookie-mock.js')
      }
    },
    define: {
      // Polyfill __dirname for ESM context during static prerendering
      // Prisma Client runtime uses __dirname which is unavailable in ESM
      '__dirname': JSON.stringify(path.resolve(__dirname))
    }
  }
});
