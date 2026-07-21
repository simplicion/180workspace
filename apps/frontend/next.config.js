// Cache bust comment to force Vercel to rebuild and drop deleted job-hunter-app components
const path = require('path');
const fs = require('fs');

const nextConfig = {
    transpilePackages: ['@workspace/ui'],
    serverExternalPackages: ['@prisma/client', 'bcryptjs', '@workspace/db'],
    output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
    reactStrictMode: true,
    poweredByHeader: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    outputFileTracingRoot: path.join(__dirname, '../../'),
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'framer-motion', 'lodash', '@mui/material'],
        staleTimes: {
            dynamic: 30,
            static: 180,
        },
    },

    // webpack: (config, { isServer, webpack }) => {
    //     config.resolve.alias['proxy-from-env'] = require.resolve('proxy-from-env/index.js');
    //     return config;
    // },

    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'api.dicebear.com' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev' },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
        ];
    },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
