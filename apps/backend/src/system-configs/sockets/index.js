'use strict';

const Redis = require('ioredis');

// Connect to Redis for publishing events
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisPublisher = new Redis(redisUrl);
const REDIS_CHANNEL = 'ims:ws-events';

// Map userId â†’ Set of socket IDs (For compatibility, though actual online logic moved to ws-backend)
// If you need real cross-service online status, you should query redis or ws-backend.
const onlineUsers = new Map();

/**
 * Empty init function so server.js doesn't crash before we remove it.
 */
function initSocket(httpServer) {
    console.log('[Socket Mock] initSocket called, but sockets are now handled by ws-backend.');
    return null;
}

/**
 * Mock io object that translates emits into Redis Pub/Sub messages
 */
const mockIo = {
    to: function(room) {
        return {
            emit: function(event, data) {
                redisPublisher.publish(REDIS_CHANNEL, JSON.stringify({
                    room,
                    event,
                    data
                }));
            }
        };
    },
    emit: function(event, data) {
        redisPublisher.publish(REDIS_CHANNEL, JSON.stringify({
            event,
            data
        }));
    }
};

function getIo() {
    return mockIo;
}

/**
 * Get online status for a list of user IDs
 * WARNING: This now only checks local memory which will be empty. 
 * Real online status needs a Redis sorted set or querying ws-backend.
 */
function isUserOnline(userId) {
    return false; // Stubbed for now
}

module.exports = { initSocket, isUserOnline, onlineUsers, getIo };
