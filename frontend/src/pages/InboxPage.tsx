import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { timeAgo } from '../lib/timeAgo';
import type { Notification } from '../types';

export default function InboxPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get<{ notifications: Notification[]; unreadCount: number }>('/api/notifications')
            .then((res) => {
                setNotifications(res.data.notifications);
                if (res.data.unreadCount > 0) {
                    api.patch('/api/notifications/read').catch(() => {});
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));

        const interval = setInterval(() => {
            api.get<{ notifications: Notification[] }>('/api/notifications')
                .then((res) => setNotifications(res.data.notifications))
                .catch(() => {});
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const getNotifText = (n: Notification): string => {
        switch (n.type) {
            case 'like': return 'liked your video';
            case 'comment': return 'commented on your video';
            case 'reply': return 'replied to your comment';
            case 'follow': return 'started following you';
            case 'tip': return `tipped you ${(n.data as Record<string, unknown>).amount} Stars`;
            case 'unlock': return 'unlocked your video';
            case 'subscription': return 'subscribed to you';
            default: return 'interacted with you';
        }
    };

    const getNotifIcon = (type: string): string => {
        switch (type) {
            case 'like': return '❤️';
            case 'comment': case 'reply': return '💬';
            case 'follow': return '👤';
            case 'tip': return '⭐';
            case 'unlock': return '🔓';
            case 'subscription': return '💎';
            default: return '🔔';
        }
    };

    const handleTap = (n: Notification) => {
        const data = n.data as Record<string, unknown>;
        if (data.videoId) navigate(`/?video=${data.videoId}`);
        else if (data.actorId) navigate(`/profile/${data.actorId}`);
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#000', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>;
    }

    return (
        <div className="h-full overflow-y-auto hide-scrollbar" style={{ backgroundColor: '#000' }}>
            <div className="px-4 pt-4 pb-2">
                <h1 className="font-bold text-lg text-white">Inbox</h1>
            </div>

            {notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    <p className="text-white/30 text-sm">No notifications yet</p>
                </div>
            )}

            <div className="flex flex-col">
                {notifications.map((n) => (
                    <button key={n.id} onClick={() => handleTap(n)}
                        className="flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer w-full"
                        style={{
                            backgroundColor: n.is_read ? 'transparent' : 'rgba(255,255,255,0.03)',
                            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                        }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                            style={{ backgroundColor: '#1c1c1e' }}>
                            {getNotifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/90">
                                <span className="font-semibold">{n.actor?.name || 'Someone'}</span>{' '}
                                <span className="text-white/60">{getNotifText(n)}</span>
                            </p>
                            <p className="text-[10px] mt-0.5 text-white/30">{timeAgo(n.created_at)}</p>
                        </div>
                    </button>
                ))}
            </div>
            <div className="h-16" />
        </div>
    );
}
