const path = require('path');
const fs = require('fs');

const nextConfig = {
    output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
    reactStrictMode: true,
    poweredByHeader: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    outputFileTracingRoot: path.join(__dirname, '../../'),
    experimental: {
        // axios removed — optimizePackageImports on axios triggers ESM analysis
        // of axios/lib/adapters/http.js which causes proxy-from-env CJS/ESM conflict
        optimizePackageImports: ['lucide-react', 'framer-motion', '@workspace/ui'],
        // Cache client-side navigations to avoid refetching page shells
        staleTimes: {
            dynamic: 30,
            static: 180,
        },
    },

    webpack: (config, { isServer, webpack }) => {
        // ... (keep this comment around proxy-from-env if there is one)
        config.resolve.alias['proxy-from-env'] = require.resolve('proxy-from-env/index.js');
        return config;
    },

    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'api.dicebear.com' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
