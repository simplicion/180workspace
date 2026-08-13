// Cache bust comment to force Vercel to rebuild and drop deleted job-hunter-app components
const path = require('path');
const fs = require('fs');

const nextConfig = {
    transpilePackages: ['@workspace/ui'],
    serverExternalPackages: ['@prisma/client', 'bcryptjs', '@workspace/db'],
    output: "standalone",
    reactStrictMode: true,
    poweredByHeader: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    outputFileTracingRoot: path.join(__dirname, '../../'),
    outputFileTracingIncludes: {
        '/*': ['./packages/db/generated/client/**/*', '../../packages/db/generated/client/**/*'],
        '/api/*': ['./packages/db/generated/client/**/*', '../../packages/db/generated/client/**/*'],
        '/**/*': ['./packages/db/generated/client/**/*', '../../packages/db/generated/client/**/*'],
    },
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'framer-motion', 'lodash', '@mui/material'],
        staleTimes: {
            dynamic: 30,
            static: 180,
        },
    },

    webpack: (config, { isServer }) => {
        if (isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                'html2pdf.js': false,
                'jspdf': false,
                '@react-pdf/renderer': false,
                'docx': false,
                'html2canvas': false,
                'leaflet': false,
                'react-leaflet': false,
                'react-signature-canvas': false,
            };
        }
        return config;
    },

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
