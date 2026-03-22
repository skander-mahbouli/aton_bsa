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

        // Poll every 30s
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

    const handleTap = (n: Notification) => {
        const data = n.data as Record<string, unknown>;
        if (data.videoId) {
            navigate(`/?video=${data.videoId}`);
        } else if (data.actorId) {
            navigate(`/profile/${data.actorId}`);
        }
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center" style={{ color: 'var(--tg-hint)' }}>Loading...</div>;
    }

    if (notifications.length === 0) {
        return (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--tg-hint)' }}>
                No notifications yet
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto" style={{ backgroundColor: 'var(--tg-bg)' }}>
            <div className="px-4 pt-4 pb-2">
                <h1 className="font-bold text-lg" style={{ color: 'var(--tg-text)' }}>Notifications</h1>
            </div>

            <div className="flex flex-col">
                {notifications.map((n) => (
                    <button key={n.id}
                        onClick={() => handleTap(n)}
                        className="flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer w-full"
                        style={{
                            backgroundColor: n.is_read ? 'transparent' : 'var(--tg-secondary-bg)',
                            borderBottom: '1px solid var(--tg-secondary-bg)',
                        }}>
                        {/* Actor avatar */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: 'var(--tg-button)' }}>
                            {n.actor?.photo_url
                                ? <img src={n.actor.photo_url} className="w-full h-full rounded-full object-cover" />
                                : (n.actor?.name || '?')[0].toUpperCase()
                            }
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm" style={{ color: 'var(--tg-text)' }}>
                                <span className="font-semibold">{n.actor?.name || 'Someone'}</span>{' '}
                                {getNotifText(n)}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--tg-hint)' }}>
                                {timeAgo(n.created_at)}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="h-4" />
        </div>
    );
}
