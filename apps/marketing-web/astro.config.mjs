import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

// https://astro.build/config
export default defineConfig({
  site: 'https://180workspace.com',
  output: 'static',
  integrations: [react(), tailwind()],
  vite: {
    resolve: {
      alias: {
        cookie: path.resolve(__dirname, 'cookie-mock.js')
      }
    },
    ssr: {
      noExternal: ['cookie'],
      external: ['@workspace/db', '@prisma/client', '.prisma/client', '@prisma/engines']
    }
  }
});
