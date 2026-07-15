'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from 'react-hot-toast';
import {
    Bell, X, Check, CheckCheck, Loader2, MessageSquare,
    FolderKanban, UserPlus, DollarSign, AlertCircle, Calendar, Mail, CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
}

const TYPE_ICONS: Record<string, { icon: any; cls: string }> = {
    task_assigned: { icon: FolderKanban, cls: 'bg-indigo-100 text-indigo-600' },
    project_update: { icon: FolderKanban, cls: 'bg-blue-100 text-blue-600' },
    message: { icon: MessageSquare, cls: 'bg-purple-100 text-purple-600' },
    user_joined: { icon: UserPlus, cls: 'bg-emerald-100 text-emerald-600' },
    salary: { icon: DollarSign, cls: 'bg-amber-100 text-amber-600' },
    attendance: { icon: Calendar, cls: 'bg-cyan-100 text-cyan-600' },
    alert: { icon: AlertCircle, cls: 'bg-red-100 text-red-600' },
    email_pending: { icon: Mail, cls: 'bg-rose-100 text-rose-600' },
    trial: { icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-600' },
};

function getTypeConfig(type: string) {
    return TYPE_ICONS[type] || { icon: Bell, cls: 'bg-gray-100 text-gray-500' };
}

import Link from 'next/link';

// ... (keep TYPE_ICONS and getTypeConfig)

export default function NotificationsPanel() {
    const [unread, setUnread] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Fetch count on mount
    useEffect(() => {
        api.get('/api/notifications?limit=1')
            .then(({ data }) => {
                setUnread(data.unreadCount);
            })
            .catch(() => { });
    }, []);

    // Listen to real-time notifications for count and toast
    useEffect(() => {
        const socket = getSocket();

        const handleNewNotification = (notif: Notification) => {
            setUnread(prev => prev + 1);

            // Show toast
            toast.custom((t) => {
                const cfg = getTypeConfig(notif.type);
                const Icon = cfg.icon;
                return (
                    <div className={clsx(
                        'max-w-sm w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5',
                        t.visible ? 'animate-enter' : 'animate-leave'
                    )}>
                        <div className="flex-1 w-0 p-4">
                            <div className="flex items-start">
                                <div className={clsx('flex-shrink-0 pt-0.5 rounded-xl p-2', cfg.cls)}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                                    <p className="mt-1 text-sm text-gray-500">{notif.message}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex border-l border-gray-200">
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                );
            }, { duration: 5000 });
        };

        if (socket) {
            socket.on('notification:new', handleNewNotification);
        }

        return () => {
            if (socket) {
                socket.off('notification:new', handleNewNotification);
            }
        };
    }, []);

    return (
        <Link
            href="/dashboard/activity"
            className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            title="Notifications & Activity"
        >
            <Bell className="w-5 h-5 text-gray-500" />
            {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none border-2 border-white">
                    {unread > 9 ? '9+' : unread}
                </span>
            )}
        </Link>
    );
}
