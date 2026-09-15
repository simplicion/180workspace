'use strict';


const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
// Form 10-char ID and Headless Capture support loaded - 2026-09-02
// Marketing Blog CMS routes loaded - 2026-09-04
// Public Blog routes loaded - 2026-09-04
// Voiceforce Cascaded Engine & Eager Barge-in loaded - 2026-09-07
// Task creation & universal Prisma relation normalizer loaded - 2026-09-12

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});


const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { prisma } = require('@workspace/db');
const { initSocket } = require('./src/system-configs/sockets');
const { queueService } = require('@workspace/backend-infra');
const { initQueues } = queueService;
const { AIJobsService, AICronService } = require('@workspace/ai');
const errorHandler = require('./src/system-configs/middleware/system/error').default || require('./src/system-configs/middleware/system/error');

// ─── Domain Event Wiring ──────────────────────────────────────────────────────
const { registerAutomationProvider, registerSocketProvider } = require('@workspace/backend-infra');
const { AutomationService: LegacyAutomationService } = require('@workspace/automations');
const { getIo } = require('./src/system-configs/sockets');

registerAutomationProvider(async (params, companyPrisma) => {
    return LegacyAutomationService.trigger(params, companyPrisma);
});

registerSocketProvider((companyId, event, payload) => {
    const io = getIo();
    if (io) io.to(`company:${companyId}`).emit(event, payload);
});

// Routes are managed in src/routes/index.routes.js



// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// Trust proxy is required for rate-limiting behind load balancers/proxies (Cloudflare/Vercel/ALB)
app.set('trust proxy', true);

// ─── Performance Instrumentation ──────────────────────────────────────────────
app.use(require('./src/system-configs/middleware/system/performance.middleware').default || require('./src/system-configs/middleware/system/performance.middleware'));

// ─── JWT Hardening ──────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET or JWT_ACCESS_SECRET must be defined in production.');
    process.exit(1);
}

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

// ─── CORS ─────────────────────────────────────────────────────────────────────
if (!process.env.CLIENT_URL && process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: CLIENT_URL must be defined in production.');
    process.exit(1);
}

const allowedOrigins = process.env.CLIENT_URL 
    ? process.env.CLIENT_URL.split(',').map(item => item.trim()) 
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:3003', 'http://127.0.0.1:3003', 'http://localhost:3004', 'http://127.0.0.1:3004'];


// ─── Public Traffic Director CORS bypass ──────────────────────────────────────
// These endpoints are called from third-party advertiser domains (any origin).
// They MUST bypass the global CORS whitelist since the tag/script runs on external sites.
// Note: We MUST ONLY match the public edge endpoints, NOT the authenticated dashboard management routes (/api/v1/traffic-director/links, etc.)
app.use((req, res, next) => {
    const publicPaths = [
        '/api/v1/traffic-director/evaluate',
        '/api/v1/traffic-director/tag',
        '/api/v1/traffic-director/stream-proxy',
        '/api/v1/traffic-director/asset-proxy',
        '/api/evaluate',
        '/evaluate',
        '/tag',
        '/r/',
        '/shield/'
    ];
    const isPublicTD = publicPaths.some(p => 
        req.path === p || 
        req.path.startsWith(p + '/') || 
        (p.endsWith('/') && req.path.startsWith(p))
    );
    if (isPublicTD) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
        res.header('Access-Control-Allow-Headers', '*');
        res.header('Access-Control-Expose-Headers', '*');
        res.header('Timing-Allow-Origin', '*');
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
    }
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        const rootDomain = process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '180workspace.com';
        if (
            !origin || 
            allowedOrigins.includes(origin) || 
            (rootDomain && (origin === `https://${rootDomain}` || origin === `http://${rootDomain}` || origin.endsWith(`.${rootDomain}`))) || 
            process.env.NODE_ENV === 'development'
        ) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy violation'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id', 'x-workspace-id', 'x-requested-with', 'Accept', 'Origin', 'Range'],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Disposition'],
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({
    limit: '5mb',
    verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/uploads', express.static('uploads'));

// ─── Global Payload Type Casting ──────────────────────────────────────────────
app.use(require('./src/system-configs/middleware/system/type-caster.middleware').default || require('./src/system-configs/middleware/system/type-caster.middleware'));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    // Only log in dev or if explicitly enabled to save I/O in production
    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('dev'));
    } else if (process.env.ENABLE_ACCESS_LOGS === 'true') {
        app.use(morgan('combined'));
    }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 3000, // Increased for dev; will be handled by skip logic for localhost
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const ip = req.ip || req.socket?.remoteAddress || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    },
    message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many auth attempts, please try again later.' },
});
app.use(globalLimiter);


// ─── Public Traffic Director Edge Routing (Zero-overhead Unauthenticated Edge) ───
const { PublicRoutingController } = require('./src/api/v1/traffic-director/public-routing.controller');
app.get('/r/_proxy/stream', (req, res, next) => PublicRoutingController.handleProxyStream(req, res).catch(next));
app.get('/r/_proxy/asset', (req, res, next) => PublicRoutingController.handleProxyAsset(req, res).catch(next));
app.get('/api/v1/traffic-director/stream-proxy', (req, res, next) => PublicRoutingController.handleProxyStream(req, res).catch(next));
app.get('/api/v1/traffic-director/asset-proxy', (req, res, next) => PublicRoutingController.handleProxyAsset(req, res).catch(next));
app.get('/r/:slug', (req, res, next) => PublicRoutingController.handleRedirect(req, res).catch(next));
app.get('/shield/:slug', (req, res, next) => PublicRoutingController.handleShieldRoute(req, res).catch(next));
app.all('/tag/:slug', (req, res, next) => PublicRoutingController.handleDynamicTag(req, res).catch(next));
app.post('/evaluate/:slug', (req, res, next) => PublicRoutingController.handleEdgeEvaluate(req, res).catch(next));
app.post('/api/v1/traffic-director/evaluate/:slug', (req, res, next) => PublicRoutingController.handleEdgeEvaluate(req, res).catch(next));
app.all('/api/v1/traffic-director/tag/:slug', (req, res, next) => PublicRoutingController.handleDynamicTag(req, res).catch(next));

// ─── Company Scoped Context Middleware ─────────────────────────────────────────
app.use(require('./src/system-configs/middleware/company/company-context').default || require('./src/system-configs/middleware/company/company-context'));

// ─── Billing Status Enforcement ──────────────────────────────────────────────
app.use(require('./src/system-configs/middleware/billing/checkBillingStatus').default || require('./src/system-configs/middleware/billing/checkBillingStatus'));

// ─── Swagger Documentation ────────────────────────────────────────────────────
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/system-configs/config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

const apiRoutes = require('./src/routes/index.routes').default || require('./src/routes/index.routes');
app.use('/api', apiRoutes);
app.use('/v1', (req, res, next) => {
    req.url = '/v1' + req.url;
    apiRoutes(req, res, next);
});

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: '🚀 Platform API is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});


// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const RUN_MODE = process.env.RUN_MODE || 'both'; // 'api', 'worker', or 'both'

async function bootstrap() {
    try {
        if (RUN_MODE === 'both' || RUN_MODE === 'api') {
            server.listen(PORT, '0.0.0.0', () => {
                console.log(`\n🚀 Platform API running on port ${PORT}`);
                console.log(`📡 Environment: ${process.env.NODE_ENV} | Mode: ${RUN_MODE}`);
                console.log(`🌐 CORS origin: ${allowedOrigins.join(', ')}\n`);
            });
        } else {
            // If strictly 'worker' mode, still bind to PORT for health checks (required by Render/Railway)
            app.get('/health', (req, res) => res.json({ status: 'ok', mode: 'worker' }));
            server.listen(PORT, () => {
                console.log(`\n👷 Worker Node running on port ${PORT} (Healthcheck only)`);
                console.log(`📡 Environment: ${process.env.NODE_ENV} | Mode: ${RUN_MODE}\n`);
            });
        }

        console.log('[Bootstrap] Connecting to database & initializing services...');
        prisma.$connect().then(() => {
            console.log('[Bootstrap] Database connected.');
        }).catch(err => {
            console.error('[Bootstrap] Database connect error:', err.message);
        });
        
        // Always initialize queues (API needs Queues to add jobs, Worker needs Workers to process)
        initQueues().then(() => {
            console.log('[Bootstrap] Queues initialized.');
        }).catch(err => {
            console.error('[Bootstrap] Queues init error:', err.message);
        });
        
        // Initialize WebSockets on HTTP server
        initSocket(server);
        console.log('[Bootstrap] Sockets initialized.');
        
        const shouldRunWorker = RUN_MODE === 'both' || RUN_MODE === 'worker' || process.env.NODE_ENV === 'development';
        if (shouldRunWorker) {
            console.log('👷 Starting Worker Services...');
            AIJobsService.init(); // Proactive AI Alerts
            AICronService.initCronJobs(); // AI Background Processes

            // Initialize Voiceforce BullMQ Outbound & Post-Call Worker
            try {
                const { setupVoiceforceWorker } = require('@workspace/voiceforce');
                const { redis } = require('./src/system-configs/config/redis');
                const vfWorker = setupVoiceforceWorker(redis);
                if (vfWorker) {
                    console.log('✅ Voiceforce BullMQ worker active on voiceforce-queue');
                }
            } catch (vfErr) {
                console.warn('⚠️ [Bootstrap] Voiceforce worker failed to start:', vfErr.message);
            }
        }
    } catch (err) {
        console.error('❌ Bootstrap failed:', err);
    }
}

bootstrap();

module.exports = app;
// Reload trigger: Voiceforce WebRTC Audio Bridge active - 2026-09-06
