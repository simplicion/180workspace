import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

import path from 'path';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  vite: {
    ssr: {
      external: ['@workspace/db', '@prisma/client', '.prisma/client']
    },
    resolve: {
      alias: {
        'cookie': path.resolve('./cookie-mock.js')
      }
    }
  }
});
