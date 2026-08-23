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
        optimizePackageImports: ['lucide-react', 'date-fns', 'lodash'],
        staleTimes: {
            dynamic: 30,
            static: 180,
        },
    },

    webpack: (config, { webpack, isServer }) => {
        if (isServer) {
            config.plugins.push(
                new webpack.NormalModuleReplacementPlugin(
                    /^@react-pdf\/renderer$|^jspdf$|^html2canvas$|^html2pdf\.js$|^docx$|^leaflet$|^react-leaflet$|^react-signature-canvas$/,
                    path.resolve(__dirname, 'dummy.js')
                )
            );
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

const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    register: true,
    skipWaiting: true,
    fallbacks: {
        document: "/~offline",
    },
    buildExcludes: [
        /middleware-manifest\.json$/,
        /middleware-build-manifest\.js$/,
        /middleware-react-loadable-manifest\.js$/,
        /dynamic-css-manifest\.json$/
    ],
});

const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(withPWA(nextConfig));
