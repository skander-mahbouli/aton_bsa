import api from '../lib/api';
import type { Video } from '../types';

interface Props {
    video: Video;
    onUnlocked: () => void;
}

export default function PaidContentOverlay({ video, onUnlocked }: Props) {
    const handleUnlock = async () => {
        try {
            const res = await api.post<{ invoiceUrl: string }>('/api/payments/stars/invoice', {
                type: 'unlock',
                videoId: video.id,
                creatorId: video.creator_id,
                amount: video.star_price,
            });

            const WebApp = (await import('@twa-dev/sdk')).default;
            WebApp.openInvoice(res.data.invoiceUrl, (status: string) => {
                if (status === 'paid') {
                    onUnlocked();
                }
            });
        } catch {
            // ignore
        }
    };

    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4">
            {/* Blurred backdrop */}
            <div className="absolute inset-0"
                style={{
                    backgroundImage: video.thumbnail_url ? `url(${video.thumbnail_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(30px) brightness(0.5)',
                }}
            />

            {/* Lock icon + button */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <button
                    onClick={handleUnlock}
                    className="px-6 py-3 rounded-full font-semibold text-sm"
                    style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                    Unlock for {video.star_price} Stars
                </button>
            </div>
        </div>
    );
}
