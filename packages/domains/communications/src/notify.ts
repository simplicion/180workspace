import { prisma } from '@workspace/db';

export async function createNotification(params: { userId: string | string[], type?: string, title: string, message: string, actionUrl?: string, io?: any }) {
    const { userId, type, title, message, actionUrl, io } = params;
    try {
        const ids = Array.isArray(userId) ? userId : [userId];
        const docs = ids.map(uid => ({ userId: uid, type: type || 'system', title, message, link: actionUrl }));
        await prisma.notification.createMany({ data: docs });

        // Emit real-time events if Socket.io instance provided
        if (io) {
            docs.forEach(n => {
                io.to(`user:${n.userId}`).emit('notification:new', n);
            });
        }
        return docs;
    } catch (err: any) {
        console.error('[Notification] Failed to create:', err.message);
        throw err;
    }
}
