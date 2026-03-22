import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { beginCell, toNano, Address } from '@ton/ton';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import WalletSection from '../components/WalletSection';
import LaunchTokenModal from '../components/LaunchTokenModal';
import type { User, Video } from '../types';

interface ProfileData extends User {
    followerCount: number;
    followingCount: number;
    videoCount: number;
    totalLikes: number;
    isFollowing?: boolean;
}

interface SubscriptionTier {
    tier: number;
    name: string;
    price_ton: string;
}

export default function ProfilePage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [activeTab, setActiveTab] = useState<'videos' | 'liked'>('videos');
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [bio, setBio] = useState('');
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const [showLaunchToken, setShowLaunchToken] = useState(false);
    const isOwnProfile = !userId || (currentUser && parseInt(userId) === currentUser.id);
    const profileId = isOwnProfile ? currentUser?.id : parseInt(userId || '0');

    useEffect(() => {
        if (!profileId) { setLoading(false); return; }

        setLoading(true);
        api.get<ProfileData>(`/api/users/${profileId}`)
            .then((res) => { setProfile(res.data); setBio(res.data.bio || ''); })
            .catch(() => {})
            .finally(() => setLoading(false));

        api.get<{ videos: Video[] }>(`/api/users/${profileId}/videos`)
            .then((res) => setVideos(res.data.videos))
            .catch(() => {});
    }, [profileId]);

    const handleFollow = async () => {
        if (!profile) return;
        try {
            const res = await api.post<{ following: boolean }>(`/api/users/${profile.id}/follow`);
            setProfile((p) => p ? { ...p, isFollowing: res.data.following, followerCount: p.followerCount + (res.data.following ? 1 : -1) } : p);
        } catch { /* ignore */ }
    };

    const handleBecomeCreator = async () => {
        try {
            await api.post('/api/users/me/creator');
            setProfile((p) => p ? { ...p, is_creator: 1 } : p);
        } catch { /* ignore */ }
    };

    const handleSaveBio = async () => {
        try {
            await api.patch('/api/users/me', { bio });
            setProfile((p) => p ? { ...p, bio } : p);
            setEditMode(false);
        } catch { /* ignore */ }
    };

    const handleSubscribe = async (tier: SubscriptionTier) => {
        if (!wallet || !profile?.wallet_address) return;
        const subManagerAddress = import.meta.env.VITE_SUBSCRIPTION_MANAGER_ADDRESS;
        if (!subManagerAddress) return;

        try {
            const body = beginCell()
                .storeUint(0x18cf41f1, 32) // Subscribe opcode
                .storeAddress(Address.parse(profile.wallet_address))
                .storeUint(tier.tier, 8)
                .endCell();

            await tonConnectUI.sendTransaction({
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [{
                    address: subManagerAddress,
                    amount: toNano(tier.price_ton).toString(),
                    payload: body.toBoc().toString('base64'),
                }],
            });

            await api.post('/api/subscriptions/record', {
                creatorId: profile.id,
                tier: tier.tier,
                txHash: `tonconnect:${Date.now()}`,
                tonAmount: tier.price_ton,
            });
        } catch { /* user rejected */ }
    };

    const handleLoadLiked = async () => {
        setActiveTab('liked');
        try {
            const res = await api.get<{ videos: Video[] }>('/api/users/me/liked');
            setVideos(res.data.videos);
        } catch { /* ignore */ }
    };

    const handleLoadVideos = async () => {
        setActiveTab('videos');
        if (!profileId) return;
        try {
            const res = await api.get<{ videos: Video[] }>(`/api/users/${profileId}/videos`);
            setVideos(res.data.videos);
        } catch { /* ignore */ }
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center" style={{ color: 'var(--tg-hint)' }}>Loading...</div>;
    }

    if (!profile) {
        return <div className="h-full flex items-center justify-center" style={{ color: 'var(--tg-hint)' }}>
            {currentUser ? 'User not found' : 'Log in to view profile'}
        </div>;
    }

    let tiers: SubscriptionTier[] = [];
    try { tiers = JSON.parse(profile.subscription_tiers || '[]'); } catch { /* ignore */ }

    return (
        <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col items-center pt-8 px-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: 'var(--tg-button)' }}>
                    {profile.photo_url
                        ? <img src={profile.photo_url} className="w-full h-full rounded-full object-cover" />
                        : (profile.name || '?')[0].toUpperCase()
                    }
                </div>
                <h2 className="mt-3 font-bold text-lg" style={{ color: 'var(--tg-text)' }}>{profile.name}</h2>
                {profile.username && (
                    <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>@{profile.username}</p>
                )}
                {profile.wallet_address && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--tg-hint)' }}>
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                        {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
                    </p>
                )}
                {profile.bio && !editMode && (
                    <p className="text-sm mt-2 text-center max-w-xs" style={{ color: 'var(--tg-text)' }}>{profile.bio}</p>
                )}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-8 mt-4">
                {[
                    { label: 'Following', value: profile.followingCount },
                    { label: 'Followers', value: profile.followerCount },
                    { label: 'Likes', value: profile.totalLikes },
                ].map((s) => (
                    <div key={s.label} className="flex flex-col items-center">
                        <span className="font-bold text-base" style={{ color: 'var(--tg-text)' }}>{s.value}</span>
                        <span className="text-xs" style={{ color: 'var(--tg-hint)' }}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-3 mt-4 px-4">
                {isOwnProfile ? (
                    <>
                        {editMode ? (
                            <div className="flex gap-2 w-full max-w-xs">
                                <input value={bio} onChange={(e) => setBio(e.target.value)}
                                    placeholder="Your bio..."
                                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                                    style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }} />
                                <button onClick={handleSaveBio}
                                    className="px-4 py-2 rounded-lg text-sm font-medium"
                                    style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>Save</button>
                            </div>
                        ) : (
                            <button onClick={() => setEditMode(true)}
                                className="px-6 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: 'var(--tg-secondary-bg)', color: 'var(--tg-text)' }}>
                                Edit Profile
                            </button>
                        )}
                        {!profile.is_creator && (
                            <button onClick={handleBecomeCreator}
                                className="px-6 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                                Become a Creator
                            </button>
                        )}
                        {profile.is_creator === 1 && !profile.jetton_address && (
                            <button onClick={() => setShowLaunchToken(true)}
                                className="px-6 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                                Launch Your Token
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <button onClick={handleFollow}
                            className="px-6 py-2 rounded-lg text-sm font-medium"
                            style={profile.isFollowing
                                ? { backgroundColor: 'var(--tg-secondary-bg)', color: 'var(--tg-text)' }
                                : { backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }
                            }>
                            {profile.isFollowing ? 'Following' : 'Follow'}
                        </button>
                        {profile.jetton_symbol && (
                            <button onClick={() => { /* Module 23 */ }}
                                className="px-6 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: 'var(--tg-secondary-bg)', color: 'var(--tg-text)' }}>
                                Buy ${profile.jetton_symbol}
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Subscription tiers */}
            {!isOwnProfile && profile.is_creator === 1 && tiers.length > 0 && (
                <div className="mt-4 px-4">
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tg-text)' }}>Subscribe</h3>
                    <div className="flex gap-2 overflow-x-auto">
                        {tiers.map((tier) => (
                            <button key={tier.tier} onClick={() => handleSubscribe(tier)}
                                className="flex-shrink-0 px-4 py-3 rounded-xl flex flex-col items-center gap-1"
                                style={{ backgroundColor: 'var(--tg-secondary-bg)', minWidth: '100px' }}>
                                <span className="font-semibold text-sm" style={{ color: 'var(--tg-text)' }}>{tier.name}</span>
                                <span className="text-xs" style={{ color: 'var(--tg-hint)' }}>{tier.price_ton} TON/mo</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Token section */}
            {profile.is_creator === 1 && profile.jetton_name && (
                <div className="mt-4 px-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'var(--tg-text)' }}>
                            ${profile.jetton_symbol}
                        </span>
                        <span className="text-xs ml-2" style={{ color: 'var(--tg-hint)' }}>{profile.jetton_name}</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex justify-center gap-8 mt-4 border-b" style={{ borderColor: 'var(--tg-secondary-bg)' }}>
                <button onClick={handleLoadVideos}
                    className="pb-2 text-sm font-medium bg-transparent border-none cursor-pointer"
                    style={{ color: activeTab === 'videos' ? 'var(--tg-text)' : 'var(--tg-hint)', borderBottom: activeTab === 'videos' ? '2px solid var(--tg-button)' : '2px solid transparent' }}>
                    Videos
                </button>
                {isOwnProfile && (
                    <button onClick={handleLoadLiked}
                        className="pb-2 text-sm font-medium bg-transparent border-none cursor-pointer"
                        style={{ color: activeTab === 'liked' ? 'var(--tg-text)' : 'var(--tg-hint)', borderBottom: activeTab === 'liked' ? '2px solid var(--tg-button)' : '2px solid transparent' }}>
                        Liked
                    </button>
                )}
            </div>

            {/* Video grid */}
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
                {videos.map((video) => (
                    <div key={video.id} className="aspect-[9/16] relative cursor-pointer"
                        onClick={() => navigate(`/?video=${video.id}`)}>
                        {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--tg-hint)" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                            </div>
                        )}
                        {/* View count overlay */}
                        <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span className="text-white text-[10px] drop-shadow">{video.view_count}</span>
                        </div>
                        {/* Paid badge */}
                        {video.visibility === 'paid' && (
                            <div className="absolute top-1 right-1">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffd700" stroke="none">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                            </div>
                        )}
                        {/* Token-gated badge */}
                        {video.visibility === 'token_gated' && (
                            <div className="absolute top-1 right-1">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {videos.length === 0 && (
                <p className="text-center text-sm py-8" style={{ color: 'var(--tg-hint)' }}>
                    No videos yet
                </p>
            )}

            {/* Wallet section (own profile) */}
            {isOwnProfile && (
                <WalletSection />
            )}

            {/* Bottom padding for nav */}
            <div className="h-4" />

            {/* Launch token modal */}
            {showLaunchToken && (
                <LaunchTokenModal
                    onClose={() => setShowLaunchToken(false)}
                    onSuccess={(addr, name, sym) => {
                        setProfile((p) => p ? { ...p, jetton_address: addr, jetton_name: name, jetton_symbol: sym } : p);
                        setShowLaunchToken(false);
                    }}
                />
            )}
        </div>
    );
}
