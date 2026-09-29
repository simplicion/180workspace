const path = require('path');

const isExport = process.env.NEXT_EXPORT === 'true' || process.env.CF_PAGES === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isExport ? { output: 'export', images: { unoptimized: true } } : {}),
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
      'framer-motion',
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ['**/.git/**', '**/.next/**', '**/node_modules/**'],
        aggregateTimeout: 300,
        poll: false,
      };
    }
    return config;
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4002';
    return [
      {
        source: '/r/:path*',
        destination: `${backendUrl}/r/:path*`,
      },
      {
        source: '/tag/:path*',
        destination: `${backendUrl}/tag/:path*`,
      },
      {
        source: '/shield/:path*',
        destination: `${backendUrl}/shield/:path*`,
      },
      {
        source: '/evaluate/:path*',
        destination: `${backendUrl}/evaluate/:path*`,
      },
    ];
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;
