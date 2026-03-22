import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { beginCell, toNano, Address } from '@ton/ton';
import api from '../lib/api';

interface DashboardData {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    videoCount: number;
    followers: number;
    subscribers: number;
    starsEarned: number;
    tonEarned: number;
    topVideos: {
        id: number;
        caption: string;
        thumbnail_url: string | null;
        view_count: number;
        like_count: number;
        comment_count: number;
        share_count: number;
        created_at: number;
    }[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    useEffect(() => {
        api.get<DashboardData>('/api/dashboard')
            .then((res) => setData(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleWithdraw = async () => {
        if (!wallet) return;
        const subManagerAddress = import.meta.env.VITE_SUBSCRIPTION_MANAGER_ADDRESS;
        if (!subManagerAddress) return;

        try {
            const body = beginCell()
                .storeUint(0x2365d020, 32) // Withdraw opcode
                .endCell();

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [{
                    address: subManagerAddress,
                    amount: toNano('0.05').toString(),
                    payload: body.toBoc().toString('base64'),
                }],
            });
        } catch {
            // user rejected
        }
    };

    const handleDelete = async (videoId: number) => {
        try {
            await api.delete(`/api/videos/${videoId}`);
            setData((d) => d ? { ...d, topVideos: d.topVideos.filter((v) => v.id !== videoId), videoCount: d.videoCount - 1 } : d);
        } catch {
            // ignore
        }
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center" style={{ color: 'var(--tg-hint)' }}>Loading...</div>;
    }

    if (!data) {
        return <div className="h-full flex items-center justify-center" style={{ color: 'var(--tg-hint)' }}>Creator access required</div>;
    }

    return (
        <div className="h-full overflow-y-auto" style={{ backgroundColor: 'var(--tg-bg)' }}>
            <div className="px-4 pt-6 pb-2">
                <div className="flex items-center justify-between">
                    <h1 className="font-bold text-xl" style={{ color: 'var(--tg-text)' }}>Dashboard</h1>
                    <button onClick={() => navigate('/profile')}
                        className="text-sm bg-transparent border-none cursor-pointer"
                        style={{ color: 'var(--tg-link)' }}>
                        Profile
                    </button>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-2 px-4 py-2">
                {[
                    { label: 'Views', value: data.totalViews },
                    { label: 'Likes', value: data.totalLikes },
                    { label: 'Followers', value: data.followers },
                    { label: 'Subscribers', value: data.subscribers },
                    { label: 'Videos', value: data.videoCount },
                    { label: 'Comments', value: data.totalComments },
                ].map((s) => (
                    <div key={s.label} className="p-3 rounded-xl"
                        style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                        <p className="text-lg font-bold" style={{ color: 'var(--tg-text)' }}>{s.value}</p>
                        <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Earnings */}
            <div className="px-4 py-2">
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tg-text)' }}>Earnings</h3>
                <div className="flex gap-2">
                    <div className="flex-1 p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                        <p className="text-lg font-bold" style={{ color: 'var(--tg-text)' }}>{data.starsEarned}</p>
                        <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>Stars</p>
                    </div>
                    <div className="flex-1 p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                        <p className="text-lg font-bold" style={{ color: 'var(--tg-text)' }}>{data.tonEarned.toFixed(2)}</p>
                        <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>TON</p>
                    </div>
                </div>
                {wallet && (
                    <button onClick={handleWithdraw}
                        className="mt-2 w-full py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                        Withdraw TON
                    </button>
                )}
            </div>

            {/* Top videos */}
            <div className="px-4 py-2">
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tg-text)' }}>Top Videos</h3>
                <div className="flex flex-col gap-2">
                    {data.topVideos.map((v) => (
                        <div key={v.id} className="flex items-center gap-3 p-2 rounded-xl"
                            style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                            <div className="w-12 h-16 rounded flex-shrink-0 overflow-hidden"
                                onClick={() => navigate(`/?video=${v.id}`)}>
                                {v.thumbnail_url ? (
                                    <img src={v.thumbnail_url} className="w-full h-full object-cover cursor-pointer" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"
                                        style={{ backgroundColor: 'var(--tg-hint)' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs truncate" style={{ color: 'var(--tg-text)' }}>{v.caption || 'No caption'}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--tg-hint)' }}>
                                    {v.view_count} views · {v.like_count} likes
                                </p>
                            </div>
                            <button onClick={() => handleDelete(v.id)}
                                className="bg-transparent border-none cursor-pointer p-1 flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tg-hint)" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="h-20" />
        </div>
    );
}
