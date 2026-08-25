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
    plugins: [
      {
        name: 'prisma-dirname-polyfill',
        transform(code, id) {
          if (id.includes('@prisma') || id.includes('.prisma') || id.includes('@workspace/db') || id.includes('library.js')) {
            if (code.includes('__dirname')) {
              return `
import { fileURLToPath as __vite_fileURLToPath } from 'url';
import { dirname as __vite_dirname } from 'path';
const __filename = __vite_fileURLToPath(import.meta.url);
const __dirname = __vite_dirname(__filename);
` + code;
            }
          }
        }
      }
    ]
  }
});
