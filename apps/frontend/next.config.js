// Reload rewrites to sync with backend port
const path = require('path');
const fs = require('fs');

const nextConfig = {
    transpilePackages: ['@workspace/ui', '@workspace/common'],
    serverExternalPackages: ['@prisma/client', 'bcryptjs', '@workspace/db'],
    output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
    outputFileTracingRoot: path.join(__dirname, '../../'),
    reactStrictMode: true,
    poweredByHeader: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
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
    async rewrites() {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';
        return [
            {
                source: '/api/v1/:path*',
                destination: `${backendUrl}/api/v1/:path*`,
            },
            {
                source: '/api/p/:path*',
                destination: `${backendUrl}/p/:path*`,
            },

            {
                source: '/tag/:slug*',
                destination: `${backendUrl}/tag/:slug*`,
            },
            {
                source: '/shield/:slug*',
                destination: `${backendUrl}/shield/:slug*`,
            },
            {
                source: '/evaluate/:slug*',
                destination: `${backendUrl}/evaluate/:slug*`,
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/((?!r/|shield/|tag/|evaluate/|f/|sites/).*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
            {
                source: '/sites/:path*',
                headers: [
                    { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://*.facebook.com https://*.meta.com https://*.google.com" },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
            {
                source: '/f/:slug*',
                headers: [
                    { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
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
