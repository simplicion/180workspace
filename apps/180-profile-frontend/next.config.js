/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@workspace/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@workspace/ui',
      'react-hot-toast',
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
    const backendUrl = process.env.NEXT_PUBLIC_CORE_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4003';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: '/api/oauth/:path*',
        destination: `${backendUrl}/api/oauth/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

