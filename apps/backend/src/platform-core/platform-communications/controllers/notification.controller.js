'use strict';

exports.getNotifications = async (req, res, next) => {
    try {
        const Notification = req.prisma.notification;
        const { page = 1, limit = 30, unreadOnly } = req.query;
        const userId = req.user.id;
        const query = { userId };
        if (unreadOnly === 'true') query.isRead = false;

        const skip = (Number(page) - 1) * Number(limit);
        const [notifications, total, unreadCount] = await Promise.all([
            Notification.findMany({
                where: query,
                orderBy: { createdAt: 'desc' },
                skip: skip,
                take: Number(limit)
            }),
            Notification.count({ where: query }),
            Notification.count({ where: { userId, isRead: false } }),
        ]);
        res.json({ notifications, total, unreadCount });
    } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
    try {
        const Notification = req.prisma.notification;
        const userId = req.user.id;
        await Notification.updateMany({ 
            where: { id: req.params.id, userId }, 
            data: { isRead: true } 
        });
        res.json({ message: 'Marked as read' });
    } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
    try {
        const Notification = req.prisma.notification;
        const userId = req.user.id;
        await Notification.updateMany({ 
            where: { userId, isRead: false }, 
            data: { isRead: true } 
        });
        res.json({ message: 'All notifications marked as read' });
    } catch (err) { next(err); }
};

exports.deleteNotification = async (req, res, next) => {
    try {
        const Notification = req.prisma.notification;
        const userId = req.user.id;
        await Notification.deleteMany({ 
            where: { id: req.params.id, userId } 
        });
        res.json({ message: 'Notification deleted' });
    } catch (err) { next(err); }
};
