const { getTenantPrisma } = require('@workspace/db');

module.exports = (io, socket, onlineUsers) => {
    const userId = socket.userId;
    const companyId = socket.companyId;

    socket.on('chat:join', ({ chatId }) => socket.join(`chat:${chatId}`));
    socket.on('chat:leave', ({ chatId }) => socket.leave(`chat:${chatId}`));

    socket.on('chat:message', async (data) => {
        try {
            const { chatId, content, attachmentUrl, attachmentType, replyTo, mentions } = data;
            const tenantPrisma = getTenantPrisma(companyId);

            const mentionsConnect = (mentions || []).map(id => ({ id }));
            const msg = await tenantPrisma.message.create({
                data: {
                    chatId,
                    senderId: userId,
                    content,
                    attachmentUrl,
                    attachmentType,
                    replyToId: replyTo || null,
                    readBy: { connect: [{ id: userId }] },
                    ...(mentionsConnect.length > 0 && { mentions: { connect: mentionsConnect } })
                },
                include: {
                    sender: { select: { id: true, name: true, email: true, photoUrl: true } },
                    replyTo: { include: { sender: { select: { id: true, name: true, email: true, photoUrl: true } } } },
                    mentions: { select: { id: true, name: true, email: true } }
                }
            });

            const chat = await tenantPrisma.chat.findUnique({
                where: { id: chatId },
                select: { members: { select: { id: true } } }
            });
            
            if (chat && chat.members) {
                chat.members.forEach(member => {
                    io.to(`user:${member.id}`).emit('chat:message', msg);
                });
            } else {
                io.to(`chat:${chatId}`).emit('chat:message', msg);
            }

            await tenantPrisma.chat.update({
                where: { id: chatId },
                data: { lastMessageId: msg.id, lastActivity: new Date() }
            }).catch(e => console.error(e));
        } catch (err) {
            console.error('[Socket] Chat message error:', err);
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('chat:typing', ({ chatId }) => socket.to(`chat:${chatId}`).emit('chat:typing', { userId, chatId }));
    socket.on('chat:stop_typing', ({ chatId }) => socket.to(`chat:${chatId}`).emit('chat:stop_typing', { userId, chatId }));

    socket.on('chat:read', async ({ chatId }) => {
        try {
            const tenantPrisma = getTenantPrisma(companyId);
            const unreadMessages = await tenantPrisma.message.findMany({
                where: { chatId, NOT: { readBy: { some: { id: userId } } } },
                select: { id: true }
            });

            if (unreadMessages.length > 0) {
                await Promise.all(unreadMessages.map(m => 
                    tenantPrisma.message.update({
                        where: { id: m.id },
                        data: { readBy: { connect: { id: userId } } }
                    })
                ));
            }
            socket.to(`chat:${chatId}`).emit('chat:read', { userId, chatId });
        } catch (err) {
            console.error('[Socket] Mark read error:', err.message);
        }
    });
};
