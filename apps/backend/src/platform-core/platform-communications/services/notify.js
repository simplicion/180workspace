'use strict';
// Reusable helper to create a notification and emit socket event
const prisma = require('@workspace/db');

/**
 * createNotification({ userId, type, title, message, actionUrl, io })
 * userId can be a single ObjectId or an array of ObjectIds
 */
async function createNotification({ userId, type, title, message, actionUrl, io }) {
    try {
        const ids = Array.isArray(userId) ? userId : [userId];
        const docs = ids.map(uid => ({ userId: uid, type: type || 'system', title, message, link: actionUrl }));
        await prisma.notification.createMany({ data: docs });
        const saved = docs;

        // Emit real-time events if Socket.io instance provided
        if (io) {
            saved.forEach(n => {
                io.to(`user:${n.userId}`).emit('notification:new', n);
            });
        }
        return saved;
    } catch (err) {
        console.error('[Notification] Failed to create:', err.message);
    }
}

module.exports = { createNotification };
