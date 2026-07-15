'use strict';

const { prisma } = require('@workspace/db');

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

function mapChat(chat) {
    if (!chat) return null;
    return {
        _id: chat.id,
        id: chat.id,
        isGroup: chat.isGroup,
        name: chat.name,
        description: chat.description,
        avatar: chat.avatar,
        lastActivity: chat.lastActivity,
        isMuted: chat.isMuted,
        members: (chat.members || []).map(mapUser),
        admins: (chat.admins || []).map(mapUser),
        lastMessage: chat.lastMessage ? mapMessage(chat.lastMessage) : null,
        pinnedMessages: (chat.pinnedMessages || []).map(m => m.id),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
    };
}

async function canChatWith(senderRole, targetRole, companyId) {
    if (targetRole === 'client' || senderRole === 'client') {
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        const metadata = company?.metadata || {};
        return metadata.employeeClientChatAllowed !== false;
    }
    return true;
}

// â”€â”€ GET /api/chat - list all chats for current user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.getChats = async (req, res, next) => {
    try {
        const Chat = req.prisma.chat;
        const chats = await Chat.findMany({
            where: {
                members: {
                    some: { id: req.user.id }
                }
            },
            include: {
                members: true,
                admins: true,
                lastMessage: {
                    include: {
                        sender: true
                    }
                }
            },
            orderBy: { lastActivity: 'desc' }
        });

        res.json({ chats: chats.map(mapChat) });
    } catch (err) { next(err); }
};

// â”€â”€ POST /api/chat - create 1:1 chat or group â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.createOrGetChat = async (req, res, next) => {
    try {
        const Chat = req.prisma.chat;
        const User = req.prisma.user;
        const Message = req.prisma.message;

        const { memberId, isGroup, name, description, memberIds, avatar } = req.body;

        // 1:1 chat â€” permission check then find/create
        if (!isGroup && memberId) {
            const targetUser = await User.findUnique({ where: { id: memberId } });
            if (!targetUser) return res.status(404).json({ error: 'User not found' });

            const allowed = await canChatWith(req.user.role, targetUser.role, req.user.companyId);
            if (!allowed) return res.status(403).json({ error: 'Chat with clients is disabled by admin. Contact your administrator.' });

            const chats = await Chat.findMany({
                where: {
                    isGroup: false,
                    AND: [
                        { members: { some: { id: req.user.id } } },
                        { members: { some: { id: memberId } } }
                    ]
                },
                include: {
                    members: true,
                    admins: true,
                    lastMessage: {
                        include: { sender: true }
                    }
                }
            });

            let chat = chats.find(c => c.members.length === 2);

            if (!chat) {
                chat = await Chat.create({
                    data: {
                        isGroup: false,
                        createdBy: { connect: { id: req.user.id } },
                        members: {
                            connect: [
                                { id: req.user.id },
                                { id: memberId }
                            ]
                        }
                    },
                    include: {
                        members: true,
                        admins: true,
                        lastMessage: {
                            include: { sender: true }
                        }
                    }
                });
            }
            return res.json({ chat: mapChat(chat) });
        }

        // Group chat (admin only creates groups)
        if (req.user.role !== 'admin' && req.user.role !== 'hr' && req.user.role !== 'manager') {
            return res.status(403).json({ error: 'Only admins/HR/managers can create group chats' });
        }

        const membersList = [...new Set([req.user.id, ...(memberIds || [])])];
        const chat = await Chat.create({
            data: {
                isGroup: true,
                name: name || 'New Group',
                description: description || '',
                avatar: avatar || 'ðŸ’¬',
                createdBy: { connect: { id: req.user.id } },
                members: {
                    connect: membersList.map(id => ({ id }))
                },
                admins: {
                    connect: [{ id: req.user.id }]
                }
            },
            include: {
                members: true,
                admins: true
            }
        });

        // System message: group created
        const sysMsg = await Message.create({
            data: {
                chatId: chat.id,
                senderId: req.user.id,
                content: `${req.user.name} created this group`,
                isSystem: true,
                readBy: {
                    connect: [{ id: req.user.id }]
                }
            }
        });

        // Update last message
        const updatedChat = await Chat.update({
            where: { id: chat.id },
            data: {
                lastMessageId: sysMsg.id,
                lastActivity: new Date()
            },
            include: {
                members: true,
                admins: true,
                lastMessage: {
                    include: { sender: true }
                }
            }
        });

        res.status(201).json({ chat: mapChat(updatedChat) });
    } catch (err) { next(err); }
};

// â”€â”€ GET /api/chat/:chatId/messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.getMessages = async (req, res, next) => {
    try {
        const Message = req.prisma.message;
        const { page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        
        const messages = await Message.findMany({
            where: { chatId: req.params.chatId, deletedAt: null },
            include: {
                sender: true,
                replyTo: {
                    include: { sender: true }
                },
                mentions: true,
                readBy: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
        });

        res.json({ messages: messages.map(mapMessage).reverse() });
    } catch (err) { next(err); }
};

// â”€â”€ POST /api/chat/:chatId/messages (REST fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.sendMessage = async (req, res, next) => {
    try {
        const Chat = req.prisma.chat;
        const Message = req.prisma.message;
        const { content, attachmentUrl, attachmentType, replyTo, mentions } = req.body;

        const msg = await Message.create({
            data: {
                chatId: req.params.chatId,
                senderId: req.user.id,
                content: content || '',
                attachmentUrl: attachmentUrl || '',
                attachmentType: attachmentType || 'none',
                replyToId: replyTo || null,
                reactions: {},
                isSystem: false,
                readBy: {
                    connect: [{ id: req.user.id }]
                },
                ...(mentions && mentions.length > 0 ? {
                    mentions: {
                        connect: mentions.map(id => ({ id }))
                    }
                } : {})
            },
            include: {
                sender: true,
                replyTo: {
                    include: { sender: true }
                },
                mentions: true,
                readBy: true
            }
        });

        await Chat.update({
            where: { id: req.params.chatId },
            data: {
                lastMessageId: msg.id,
                lastActivity: new Date()
            }
        });

        res.status(201).json({ message: mapMessage(msg) });
    } catch (err) { next(err); }
};

// â”€â”€ PUT /api/chat/:chatId/read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.markAsRead = async (req, res, next) => {
    try {
        const Message = req.prisma.message;
        
        // Find messages where user is not in readBy
        const unreadMessages = await Message.findMany({
            where: {
                chatId: req.params.chatId,
                NOT: {
                    readBy: {
                        some: { id: req.user.id }
                    }
                }
            }
        });

        for (const msg of unreadMessages) {
            await Message.update({
                where: { id: msg.id },
                data: {
                    readBy: {
                        connect: [{ id: req.user.id }]
                    }
                }
            });
        }

        res.json({ message: 'Marked as read' });
    } catch (err) { next(err); }
};

// â”€â”€ POST /api/chat/:chatId/react â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.reactToMessage = async (req, res, next) => {
    try {
        const Message = req.prisma.message;
        const { messageId, emoji } = req.body;
        const uid = req.user.id;

        const msg = await Message.findUnique({ where: { id: messageId } });
        if (!msg) return res.status(404).json({ error: 'Message not found' });

        const reactions = msg.reactions || {};
        if (!reactions[emoji]) reactions[emoji] = [];

        // Toggle
        const idx = reactions[emoji].indexOf(uid);
        if (idx >= 0) {
            reactions[emoji].splice(idx, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            reactions[emoji].push(uid);
        }

        const updated = await Message.update({
            where: { id: messageId },
            data: { reactions }
        });

        res.json({ reactions: updated.reactions });
    } catch (err) { next(err); }
};

// â”€â”€ DELETE /api/chat/:chatId/messages/:msgId (soft delete) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.deleteMessage = async (req, res, next) => {
    try {
        const Message = req.prisma.message;
        const msg = await Message.findUnique({ where: { id: req.params.msgId } });
        if (!msg) return res.status(404).json({ error: 'Not found' });
        if (msg.senderId !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await Message.update({
            where: { id: req.params.msgId },
            data: {
                deletedAt: new Date(),
                deletedById: req.user.id,
                content: 'This message was deleted'
            }
        });

        res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
};

// â”€â”€ POST /api/chat/:chatId/members (admin: add members to group) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.addMembers = async (req, res, next) => {
    try {
        const Chat = req.prisma.chat;
        const User = req.prisma.user;
        const Message = req.prisma.message;

        const { memberIds } = req.body;
        const chat = await Chat.findUnique({
            where: { id: req.params.chatId },
            include: { members: true, admins: true }
        });
        if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found' });
        if (!chat.admins.some(a => a.id === req.user.id) && !['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only group admins can add members' });
        }

        const existing = chat.members.map(m => m.id);
        const toAdd = memberIds.filter((id) => !existing.includes(id));

        const updatedChat = await Chat.update({
            where: { id: req.params.chatId },
            data: {
                members: {
                    connect: toAdd.map(id => ({ id }))
                }
            },
            include: {
                members: true,
                admins: true,
                lastMessage: {
                    include: { sender: true }
                }
            }
        });

        // System message
        const names = await User.findMany({
            where: { id: { in: toAdd } },
            select: { name: true }
        });

        await Message.create({
            data: {
                chatId: chat.id,
                senderId: req.user.id,
                content: `${req.user.name} added ${names.map(n => n.name).join(', ')} to the group`,
                isSystem: true,
                readBy: {
                    connect: [{ id: req.user.id }]
                }
            }
        });

        res.json({ chat: mapChat(updatedChat) });
    } catch (err) { next(err); }
};

// â”€â”€ DELETE /api/chat/:chatId/members/:memberId (remove from group) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.removeMember = async (req, res, next) => {
    try {
        const Chat = req.prisma.chat;
        const User = req.prisma.user;
        const Message = req.prisma.message;

        const chat = await Chat.findUnique({
            where: { id: req.params.chatId },
            include: { admins: true }
        });
        if (!chat || !chat.isGroup) return res.status(404).json({ error: 'Group not found' });
        if (!chat.admins.some(a => a.id === req.user.id) && !['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only group admins can remove members' });
        }

        await Chat.update({
            where: { id: req.params.chatId },
            data: {
                members: {
                    disconnect: [{ id: req.params.memberId }]
                }
            }
        });

        const removed = await User.findUnique({ where: { id: req.params.memberId }, select: { name: true } });
        await Message.create({
            data: {
                chatId: chat.id,
                senderId: req.user.id,
                content: `${req.user.name} removed ${removed?.name || 'a member'} from the group`,
                isSystem: true,
                readBy: {
                    connect: [{ id: req.user.id }]
                }
            }
        });

        res.json({ message: 'Member removed' });
    } catch (err) { next(err); }
};

// â”€â”€ GET /api/chat/settings - get client chat toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.getChatSettings = async (req, res, next) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId }
        });
        const metadata = company?.metadata || {};
        res.json({ employeeClientChatAllowed: metadata.employeeClientChatAllowed !== false });
    } catch (err) { next(err); }
};

// â”€â”€ PUT /api/chat/settings - admin toggle client chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.updateChatSettings = async (req, res, next) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ error: 'Admin only' });
        const { employeeClientChatAllowed } = req.body;

        const company = await prisma.company.findUnique({
            where: { id: req.user.companyId }
        });

        await prisma.company.update({
            where: { id: req.user.companyId },
            data: {
                metadata: {
                    ...(company?.metadata || {}),
                    employeeClientChatAllowed
                }
            }
        });

        res.json({ message: 'Settings updated', employeeClientChatAllowed });
    } catch (err) { next(err); }
};

// â”€â”€ POST /api/chat/:chatId/pin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.pinMessage = async (req, res, next) => {
    try {
        const Chat = req.prisma.chat;
        const { messageId } = req.body;
        const chat = await Chat.findUnique({
            where: { id: req.params.chatId },
            include: { pinnedMessages: true }
        });
        if (!chat) return res.status(404).json({ error: 'Chat not found' });

        const isPinned = chat.pinnedMessages.some(m => m.id === messageId);
        
        const updatedChat = await Chat.update({
            where: { id: req.params.chatId },
            data: {
                pinnedMessages: isPinned ? {
                    disconnect: [{ id: messageId }]
                } : {
                    connect: [{ id: messageId }]
                }
            },
            include: {
                pinnedMessages: true
            }
        });

        res.json({ pinnedMessages: updatedChat.pinnedMessages.map(m => m.id) });
    } catch (err) { next(err); }
};
