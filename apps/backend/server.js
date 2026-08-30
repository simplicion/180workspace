'use strict';


const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

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
const { AiJobsService, AiCronService } = require('@workspace/workspace-tools');
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

// Trust proxy is required for rate-limiting behind load balancers/proxies
app.set('trust proxy', 1);

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
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];


app.use(cors({
    origin: (origin, callback) => {
        console.log('RECEIVED ORIGIN:', origin);
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.180workspace.com') || process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        return callback(new Error('CORS policy violation'), false);
    },
    credentials: true,
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

// ─── Public Traffic Director Edge Routing ─────────────────────────────────────
const { publicRoutes: trafficDirectorPublicRoutes } = require('./src/api/v1/traffic-director/index');
const { PublicRoutingController } = require('./src/api/v1/traffic-director/public-routing.controller');
app.use('/r', trafficDirectorPublicRoutes);
app.get('/shield/:slug', (req, res) => PublicRoutingController.handleShieldRoute(req, res));
app.get('/tag/:slug', (req, res) => PublicRoutingController.handleDynamicTag(req, res));

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
        await prisma.$connect();
        
        // Always initialize queues (API needs Queues to add jobs, Worker needs Workers to process)
        await initQueues();
        
        // Initialize WebSockets on HTTP server
        initSocket(server);
        
        
        if (RUN_MODE === 'both' || RUN_MODE === 'worker') {
            console.log('👷 Starting Worker Services (Delegated to external worker app)');
            // CronService.init(); -> Moved to apps/worker
            AiJobsService.init(); // Phase 6: Proactive AI Alerts
            const aiCron = new AiCronService();
            aiCron.initCronJobs(); // AI Background Processes
        }
        
        if (RUN_MODE === 'both' || RUN_MODE === 'api') {
            server.listen(PORT, () => {
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
    } catch (err) {
        console.error('❌ Bootstrap failed:', err);
        process.exit(1);
    }
}

bootstrap();

module.exports = app;
 
// trigger restart

 
// trigger restart 2


