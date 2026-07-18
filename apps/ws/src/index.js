'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const authMiddleware = require('./middlewares/auth.middleware');
const registerChatEvents = require('./events/chat.events');
const registerCallEvents = require('./events/call.events');

const app = express();
const server = http.createServer(app);

app.get('/health', (req, res) => res.status(200).send('WS Backend is healthy'));

const allowedOrigins = process.env.CLIENT_URL 
    ? process.env.CLIENT_URL.split(',').map(url => url.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'https://pitchin180.com'];

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
    pingTimeout: 60000,
});

// Map userId -> Set of socket IDs
const onlineUsers = new Map();

// Redis setup for Pub/Sub
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisSubscriber = new Redis(redisUrl);
const REDIS_CHANNEL = 'ims:ws-events';

// â”€â”€ Auth middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
io.use(authMiddleware);

io.on('connection', (socket) => {
    const userId = socket.userId;
    const companyId = socket.companyId;
    console.log(`[Socket] ${socket.user.name} connected (${socket.id}) to company ${companyId}`);

    // Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    socket.join(`user:${userId}`);

    // Send the list of currently online users to this socket
    socket.emit('users:online_list', { onlineUsers: Array.from(onlineUsers.keys()) });

    if (companyId) {
        socket.join(`company:${companyId}`);
    }
    
    // Always emit online status globally so cross-company (employer) users see it
    io.emit('user:online', { userId, isOnline: true });

    // Register modular events
    registerChatEvents(io, socket, onlineUsers);
    registerCallEvents(io, socket, onlineUsers);

    socket.on('disconnect', () => {
        const sockets = onlineUsers.get(userId);
        if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
                onlineUsers.delete(userId);
                io.emit('user:offline', { userId, isOnline: false });
            }
        }
        console.log(`[Socket] ${socket.user.name} disconnected`);
    });
});

// â”€â”€ Redis Pub/Sub Listener â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
redisSubscriber.subscribe(REDIS_CHANNEL, (err, count) => {
    if (err) {
        console.error('[WS-Backend] Failed to subscribe to Redis Channel:', err);
    } else {
        console.log(`[WS-Backend] Subscribed to ${count} channel(s). Listening on: ${REDIS_CHANNEL}`);
    }
});

redisSubscriber.on('message', (channel, message) => {
    if (channel !== REDIS_CHANNEL) return;
    try {
        const parsed = JSON.parse(message);
        const { room, event, data, userId } = parsed;

        if (room) {
            // Emitting to a specific room (e.g. 'user:123', 'company:abc')
            console.log(`[WS-Backend] Broadcasting event '${event}' to room '${room}'`);
            io.to(room).emit(event, data);
        } else if (userId) {
            // Check if user is online and emit individually if no room specified
            console.log(`[WS-Backend] Emitting event '${event}' to userId '${userId}'`);
            const userSockets = onlineUsers.get(userId);
            if (userSockets && userSockets.size > 0) {
                userSockets.forEach(socketId => io.to(socketId).emit(event, data));
            }
        } else {
            // Broadcast to everyone
            console.log(`[WS-Backend] Broadcasting global event '${event}'`);
            io.emit(event, data);
        }
    } catch (e) {
        console.error('[WS-Backend] Error parsing Redis message:', e);
    }
});

const PORT = process.env.WS_PORT || 3002;
server.listen(PORT, () => {
    console.log(`[WS-Backend] Server running on port ${PORT}`);
});
