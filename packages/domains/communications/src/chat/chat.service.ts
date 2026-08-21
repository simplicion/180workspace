import { prisma as db } from '@workspace/db';

export class ChatService {
    static mapUser(user: any) {
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

    static mapMessage(msg: any) {
        if (!msg) return null;
        return {
            _id: msg.id,
            id: msg.id,
            chatId: msg.chatId,
            content: msg.content,
            attachmentUrl: msg.attachmentUrl,
            attachmentType: msg.attachmentType,
            isSystem: msg.isSystem,
            readBy: (msg.readBy || []).map((u: any) => u.id),
            reactions: msg.reactions || {},
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
            deletedAt: msg.deletedAt,
            deletedBy: msg.deletedById,
            senderId: this.mapUser(msg.sender),
            replyTo: msg.replyTo ? this.mapMessage(msg.replyTo) : null,
            mentions: (msg.mentions || []).map(this.mapUser)
        };
    }

    static mapChat(chat: any) {
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
            members: (chat.members || []).map(this.mapUser),
            admins: (chat.admins || []).map(this.mapUser),
            lastMessage: chat.lastMessage ? this.mapMessage(chat.lastMessage) : null,
            pinnedMessages: (chat.pinnedMessages || []).map((m: any) => m.id),
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt
        };
    }

    static async canChatWith(senderRole: string, targetRole: string, companyId: string) {
        if (targetRole === 'client' || senderRole === 'client') {
            const company = await db.company.findUnique({
                where: { id: companyId }
            });
            const metadata = (company?.metadata as any) || {};
            return metadata.employeeClientChatAllowed !== false;
        }
        return true;
    }

    static async getChats(user: any) {
        const chats = await db.chat.findMany({
            where: {
                members: {
                    some: { id: user.id }
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

        return chats.map((c: any) => this.mapChat(c));
    }

    static async createOrGetChat(user: any, data: any) {
        const { memberId, isGroup, name, description, memberIds, avatar } = data;

        // 1:1 chat
        if (!isGroup && memberId) {
            const targetUser = await db.user.findUnique({ where: { id: memberId } });
            if (!targetUser) throw new Error('User not found');

            const allowed = await this.canChatWith(user.role, targetUser.role, user.companyId);
            if (!allowed) throw new Error('Chat with clients is disabled by admin. Contact your administrator.');

            const chats = await db.chat.findMany({
                where: {
                    isGroup: false,
                    AND: [
                        { members: { some: { id: user.id } } },
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

            let chat = chats.find((c: any) => c.members.length === 2);

            if (!chat) {
                chat = await db.chat.create({
                    data: {
                        isGroup: false,
                        createdBy: { connect: { id: user.id } },
                        members: {
                            connect: [
                                { id: user.id },
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
            return this.mapChat(chat);
        }

        // Group chat
        if (user.role !== 'admin' && user.role !== 'hr' && user.role !== 'manager') {
            throw new Error('Only admins/HR/managers can create group chats');
        }

        const membersList = [...new Set([user.id, ...(memberIds || [])])];
        const chat = await db.chat.create({
            data: {
                isGroup: true,
                name: name || 'New Group',
                description: description || '',
                avatar: avatar || '💬',
                createdBy: { connect: { id: user.id } },
                members: {
                    connect: membersList.map((id: string) => ({ id }))
                },
                admins: {
                    connect: [{ id: user.id }]
                }
            },
            include: {
                members: true,
                admins: true
            }
        });

        // System message: group created
        const sysMsg = await db.message.create({
            data: {
                chatId: chat.id,
                senderId: user.id,
                content: `${user.name} created this group`,
                isSystem: true,
                readBy: {
                    connect: [{ id: user.id }]
                }
            }
        });

        // Update last message
        const updatedChat = await db.chat.update({
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

        return this.mapChat(updatedChat);
    }

    static async getMessages(chatId: string, query: any) {
        const { page = 1, limit = 50 } = query;
        const skip = (Number(page) - 1) * Number(limit);
        
        const messages = await db.message.findMany({
            where: { chatId, deletedAt: null },
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

        return messages.map((m: any) => this.mapMessage(m)).reverse();
    }

    static async sendMessage(user: any, chatId: string, data: any) {
        const { content, attachmentUrl, attachmentType, replyTo, mentions } = data;

        const msg = await db.message.create({
            data: {
                chatId,
                senderId: user.id,
                content: content || '',
                attachmentUrl: attachmentUrl || '',
                attachmentType: attachmentType || 'none',
                replyToId: replyTo || null,
                reactions: {},
                isSystem: false,
                readBy: {
                    connect: [{ id: user.id }]
                },
                ...(mentions && mentions.length > 0 ? {
                    mentions: {
                        connect: mentions.map((id: string) => ({ id }))
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

        await db.chat.update({
            where: { id: chatId },
            data: {
                lastMessageId: msg.id,
                lastActivity: new Date()
            }
        });

        return this.mapMessage(msg);
    }

    static async markAsRead(user: any, chatId: string) {
        const unreadMessages = await db.message.findMany({
            where: {
                chatId,
                NOT: {
                    readBy: {
                        some: { id: user.id }
                    }
                }
            }
        });

        for (const msg of unreadMessages) {
            await db.message.update({
                where: { id: msg.id },
                data: {
                    readBy: {
                        connect: [{ id: user.id }]
                    }
                }
            });
        }

        return { message: 'Marked as read' };
    }

    static async reactToMessage(user: any, messageId: string, emoji: string) {
        const uid = user.id;

        const msg = await db.message.findUnique({ where: { id: messageId } });
        if (!msg) throw new Error('Message not found');

        const reactions = (msg.reactions as any) || {};
        if (!reactions[emoji]) reactions[emoji] = [];

        // Toggle
        const idx = reactions[emoji].indexOf(uid);
        if (idx >= 0) {
            reactions[emoji].splice(idx, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            reactions[emoji].push(uid);
        }

        const updated = await db.message.update({
            where: { id: messageId },
            data: { reactions }
        });

        return updated.reactions;
    }

    static async deleteMessage(user: any, msgId: string) {
        const msg = await db.message.findUnique({ where: { id: msgId } });
        if (!msg) throw new Error('Not found');
        if (msg.senderId !== user.id && !['admin', 'manager'].includes(user.role)) {
            throw new Error('Forbidden');
        }

        await db.message.update({
            where: { id: msgId },
            data: {
                deletedAt: new Date(),
                deletedById: user.id,
                content: 'This message was deleted'
            }
        });

        return { message: 'Deleted' };
    }

    static async addMembers(user: any, chatId: string, memberIds: string[]) {
        const chat = await db.chat.findUnique({
            where: { id: chatId },
            include: { members: true, admins: true }
        });
        if (!chat || !chat.isGroup) throw new Error('Group not found');
        if (!chat.admins.some((a: any) => a.id === user.id) && !['admin', 'manager'].includes(user.role)) {
            throw new Error('Only group admins can add members');
        }

        const existing = chat.members.map((m: any) => m.id);
        const toAdd = memberIds.filter((id: string) => !existing.includes(id));

        const updatedChat = await db.chat.update({
            where: { id: chatId },
            data: {
                members: {
                    connect: toAdd.map((id: string) => ({ id }))
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
        const names = await db.user.findMany({
            where: { id: { in: toAdd } },
            select: { name: true }
        });

        await db.message.create({
            data: {
                chatId: chat.id,
                senderId: user.id,
                content: `${user.name} added ${names.map((n: any) => n.name).join(', ')} to the group`,
                isSystem: true,
                readBy: {
                    connect: [{ id: user.id }]
                }
            }
        });

        return this.mapChat(updatedChat);
    }

    static async removeMember(user: any, chatId: string, memberId: string) {
        const chat = await db.chat.findUnique({
            where: { id: chatId },
            include: { admins: true }
        });
        if (!chat || !chat.isGroup) throw new Error('Group not found');
        if (!chat.admins.some((a: any) => a.id === user.id) && !['admin', 'manager'].includes(user.role)) {
            throw new Error('Only group admins can remove members');
        }

        await db.chat.update({
            where: { id: chatId },
            data: {
                members: {
                    disconnect: [{ id: memberId }]
                }
            }
        });

        const removed = await db.user.findUnique({ where: { id: memberId }, select: { name: true } });
        await db.message.create({
            data: {
                chatId: chat.id,
                senderId: user.id,
                content: `${user.name} removed ${removed?.name || 'a member'} from the group`,
                isSystem: true,
                readBy: {
                    connect: [{ id: user.id }]
                }
            }
        });

        return { message: 'Member removed' };
    }

    static async getChatSettings(user: any) {
        const company = await db.company.findUnique({
            where: { id: user.companyId }
        });
        const metadata = (company?.metadata as any) || {};
        return { employeeClientChatAllowed: metadata.employeeClientChatAllowed !== false };
    }

    static async updateChatSettings(user: any, employeeClientChatAllowed: boolean) {
        if (!['admin', 'manager'].includes(user.role)) throw new Error('Admin only');

        const company = await db.company.findUnique({
            where: { id: user.companyId }
        });

        await db.company.update({
            where: { id: user.companyId },
            data: {
                metadata: {
                    ...((company?.metadata as any) || {}),
                    employeeClientChatAllowed
                }
            }
        });

        return { message: 'Settings updated', employeeClientChatAllowed };
    }

    static async pinMessage(chatId: string, messageId: string) {
        const chat = await db.chat.findUnique({
            where: { id: chatId },
            include: { pinnedMessages: true }
        });
        if (!chat) throw new Error('Chat not found');

        const isPinned = chat.pinnedMessages.some((m: any) => m.id === messageId);
        
        const updatedChat = await db.chat.update({
            where: { id: chatId },
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

        return updatedChat.pinnedMessages.map((m: any) => m.id);
    }
}
