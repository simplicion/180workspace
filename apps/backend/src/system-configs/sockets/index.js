'use strict';

const { Server } = require('socket.io');
const Redis = require('ioredis');

const authMiddleware = require('./middlewares/auth.middleware');
const registerChatEvents = require('./events/chat.events');
const registerCallEvents = require('./events/call.events');

// Map userId -> Set of socket IDs
const onlineUsers = new Map();

// Redis setup for Pub/Sub
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const REDIS_CHANNEL = 'ims:ws-events';

let redisPublisher = null;
let redisSubscriber = null;
let ioInstance = null;

function getRedisPublisher() {
    if (!redisPublisher) {
        try {
            redisPublisher = new Redis(redisUrl, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
                lazyConnect: true
            });
            redisPublisher.connect().catch(err => {
                console.warn('[Socket Redis Publisher] Connection warning:', err.message);
            });
        } catch (err) {
            console.warn('[Socket Redis Publisher] Init error:', err.message);
        }
    }
    return redisPublisher;
}

/**
 * Mock IO fallback for contexts where HTTP server is not initialized (e.g. CLI or worker tasks)
 */
const mockIo = {
    to: function(room) {
        return {
            emit: function(event, data) {
                const pub = getRedisPublisher();
                if (pub) {
                    pub.publish(REDIS_CHANNEL, JSON.stringify({ room, event, data })).catch(() => {});
                }
            }
        };
    },
    emit: function(event, data) {
        const pub = getRedisPublisher();
        if (pub) {
            pub.publish(REDIS_CHANNEL, JSON.stringify({ event, data })).catch(() => {});
        }
    }
};

/**
 * Initializes the Socket.IO server directly on the Express HTTP Server
 */
function initSocket(httpServer) {
    if (ioInstance) {
        return ioInstance;
    }

    const allowedOrigins = process.env.CLIENT_URL 
        ? process.env.CLIENT_URL.split(',').map(url => url.trim())
        : (process.env.NODE_ENV === 'development' 
            ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002', 'http://127.0.0.1:3003'] 
            : [`https://${process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '180workspace.com'}`]);

    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
        pingTimeout: 60000,
    });

    // Authentication middleware
    io.use(authMiddleware);

    io.on('connection', (socket) => {
        const userId = socket.userId;
        const companyId = socket.companyId;
        const userName = socket.user?.name || 'User';
        console.log(`[Socket] ${userName} connected (${socket.id}) ${companyId ? `to company ${companyId}` : ''}`);

        // Track online users
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        socket.join(`user:${userId}`);

        // Send the list of currently online users to this socket
        socket.emit('users:online_list', { onlineUsers: Array.from(onlineUsers.keys()) });

        if (companyId) {
            socket.join(`company:${companyId}`);
            // Broadcast user online status strictly to members of the same company
            io.to(`company:${companyId}`).emit('user:online', { userId, isOnline: true });
        } else {
            // If super-admin or system account without company, broadcast only to their personal room
            socket.emit('user:online', { userId, isOnline: true });
        }

        // Register modular events
        registerChatEvents(io, socket, onlineUsers);
        registerCallEvents(io, socket, onlineUsers);

        socket.on('disconnect', () => {
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                    if (companyId) {
                        io.to(`company:${companyId}`).emit('user:offline', { userId, isOnline: false });
                    }
                }
            }
            console.log(`[Socket] ${userName} disconnected`);
        });
    });

    // Redis Pub/Sub Listener for background worker events
    try {
        redisSubscriber = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            lazyConnect: true
        });

        redisSubscriber.connect().then(() => {
            redisSubscriber.subscribe(REDIS_CHANNEL, (err, count) => {
                if (err) {
                    console.warn('[Socket Redis Subscriber] Failed to subscribe to Redis Channel:', err.message);
                } else {
                    console.log(`[Socket Redis Subscriber] Subscribed to ${count} channel(s). Channel: ${REDIS_CHANNEL}`);
                }
            });
        }).catch(err => {
            console.warn('[Socket Redis Subscriber] Connection warning:', err.message);
        });

        redisSubscriber.on('message', (channel, message) => {
            if (channel !== REDIS_CHANNEL) return;
            try {
                const parsed = JSON.parse(message);
                const { room, companyId, event, data, userId } = parsed;

                if (room) {
                    io.to(room).emit(event, data);
                } else if (companyId) {
                    io.to(`company:${companyId}`).emit(event, data);
                } else if (userId) {
                    const userSockets = onlineUsers.get(userId);
                    if (userSockets && userSockets.size > 0) {
                        userSockets.forEach(socketId => io.to(socketId).emit(event, data));
                    }
                } else {
                    // Safe fallback: avoid un-scoped global emit
                    console.warn('[Socket Redis] Warning: message lacked room or companyId, dropping un-scoped broadcast for event:', event);
                }
            } catch (e) {
                console.error('[Socket Redis Subscriber] Error parsing Redis message:', e.message);
            }
        });
    } catch (err) {
        console.warn('[Socket Redis Subscriber] Initialization failed:', err.message);
    }

    ioInstance = io;
    console.log('⚡ Socket.IO initialized on main HTTP server');
    return ioInstance;
}

function getIo() {
    return ioInstance || mockIo;
}

function emitToCompany(companyId, event, data) {
    if (!companyId) return;
    const io = getIo();
    io.to(`company:${companyId}`).emit(event, data);
}

function emitToUser(userId, event, data) {
    if (!userId) return;
    const io = getIo();
    io.to(`user:${userId}`).emit(event, data);
}

function isUserOnline(userId) {
    const sockets = onlineUsers.get(userId);
    return Boolean(sockets && sockets.size > 0);
}

module.exports = { 
    initSocket, 
    isUserOnline, 
    onlineUsers, 
    getIo,
    emitToCompany,
    emitToUser
};
