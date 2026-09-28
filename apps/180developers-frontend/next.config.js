/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@workspace/ui', '@workspace/identity-sdk'],
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@workspace/ui',
      '@workspace/identity-sdk',
      'react-hot-toast',
    ],
  },
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Optimize watch options on Windows to avoid EMFILE and memory leaks
      config.watchOptions = {
        ignored: ['**/.git/**', '**/.next/**', '**/node_modules/**'],
        aggregateTimeout: 300,
        poll: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

