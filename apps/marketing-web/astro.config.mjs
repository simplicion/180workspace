import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

import path from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
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
        enforce: 'pre',
        transform(code, id) {
          // Fix for Prisma's direct __dirname usage in index.js when flattened by Rollup
          if (id.replace(/\\\\/g, '/').includes('packages/db/generated/client/index.js')) {
            return `globalThis.__dirname = typeof __dirname !== "undefined" ? __dirname : (typeof process !== "undefined" ? process.cwd() : "");\nglobalThis.__filename = typeof __filename !== "undefined" ? __filename : (typeof process !== "undefined" ? process.cwd() + "/index.js" : "");\n` + code;
          }
          // Fix for eval("__dirname") and __filename in library.js
          if (id.replace(/\\\\/g, '/').includes('packages/db/generated/client/runtime/library.js')) {
            return `globalThis.__dirname = typeof __dirname !== "undefined" ? __dirname : (typeof process !== "undefined" ? process.cwd() : "");\nglobalThis.__filename = typeof __filename !== "undefined" ? __filename : (typeof process !== "undefined" ? process.cwd() + "/library.js" : "");\n` + code;
          }
          return code;
        }
      }
    ]
  }
});
