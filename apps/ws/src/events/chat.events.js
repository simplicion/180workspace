const { getTenantPrisma } = require('@workspace/db');

function mapUser(user) {
    if (!user) return null;
    return {
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl || user.image || '',
        role: user.role
    };
}

function mapMessage(msg) {
    if (!msg) return null;
    return {
        _id: msg.id,
        id: msg.id,
        chatId: msg.chatId,
        content: msg.content,
        attachmentUrl: msg.attachmentUrl,
        attachmentType: msg.attachmentType,
        isSystem: msg.isSystem,
        readBy: (msg.readBy || []).map(u => u.id),
        reactions: msg.reactions || {},
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        deletedAt: msg.deletedAt,
        deletedBy: msg.deletedById,
        senderId: mapUser(msg.sender),
        replyTo: msg.replyTo ? mapMessage(msg.replyTo) : null,
        mentions: (msg.mentions || []).map(mapUser)
    };
}

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
                    content: content || '',
                    attachmentUrl: attachmentUrl || '',
                    attachmentType: attachmentType || 'none',
                    replyToId: replyTo || null,
                    readBy: { connect: [{ id: userId }] },
                    ...(mentionsConnect.length > 0 && { mentions: { connect: mentionsConnect } })
                },
                include: {
                    sender: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                    replyTo: { include: { sender: { select: { id: true, name: true, email: true, photoUrl: true, role: true } } } },
                    mentions: { select: { id: true, name: true, email: true, role: true } },
                    readBy: { select: { id: true } }
                }
            });

            const chat = await tenantPrisma.chat.findUnique({
                where: { id: chatId },
                select: { members: { select: { id: true } } }
            });
            
            const mappedMsg = mapMessage(msg);

            if (chat && chat.members) {
                chat.members.forEach(member => {
                    io.to(`user:${member.id}`).emit('chat:message', mappedMsg);
                });
            } else {
                io.to(`chat:${chatId}`).emit('chat:message', mappedMsg);
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
