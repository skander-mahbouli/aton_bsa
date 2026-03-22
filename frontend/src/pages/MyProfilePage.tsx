import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSignal, initData } from '@tma.js/sdk-react';
import { useTonConnectUI, useTonWallet, TonConnectButton } from '@tonconnect/ui-react';
import { TonIcon } from '@/components/TonIcon';
import { VideoThumb } from '@/components/VideoThumb';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Video as ApiVideo } from '@/types';
import { mapApiVideo } from '@/hooks/useVideos';

interface ProfileData {
  id: number;
  name: string;
  username: string | null;
  photo_url: string | null;
  bio: string | null;
  is_creator: number;
  wallet_address: string | null;
  stars_balance: number;
  jetton_address: string | null;
  jetton_name: string | null;
  jetton_symbol: string | null;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  totalLikes: number;
}

export function MyProfilePage() {
  const tgUser = useSignal(initData.user);
  const authUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [activeTab, setActiveTab] = useState<'videos' | 'liked'>('videos');
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  const photoUrl = tgUser?.photo_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgUser?.id ?? 'me'}`;

  useEffect(() => {
    if (!authUser?.id) return;
    api.get<ProfileData>(`/api/users/${authUser.id}`)
      .then(res => setProfile(res.data))
      .catch(() => {});
    api.get<{ videos: ApiVideo[] }>(`/api/users/${authUser.id}/videos`)
      .then(res => setVideos(res.data.videos))
      .catch(() => {});
  }, [authUser?.id]);

  // Sync wallet address
  useEffect(() => {
    if (wallet) {
      api.patch('/api/users/me', { walletAddress: wallet.account.address }).catch(() => {});
    }
  }, [wallet]);

  function handleLoadLiked() {
    setActiveTab('liked');
    api.get<{ videos: ApiVideo[] }>('/api/users/me/liked')
      .then(res => setVideos(res.data.videos))
      .catch(() => {});
  }

  function handleLoadVideos() {
    setActiveTab('videos');
    if (!authUser?.id) return;
    api.get<{ videos: ApiVideo[] }>(`/api/users/${authUser.id}/videos`)
      .then(res => setVideos(res.data.videos))
      .catch(() => {});
  }

  async function handleBecomeCreator() {
    try {
      await api.post('/api/users/me/creator');
      setProfile(p => p ? { ...p, is_creator: 1 } : p);
    } catch { /* ignore */ }
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="top-bar">
        <Link to="/" className="back-button" aria-label="Back to feed">← Feed</Link>
        <span className="app-logo">My Profile</span>
        <div style={{ width: 72 }} />
      </div>

      <div style={{ padding: '1rem', textAlign: 'center' }}>
        {/* Avatar */}
        <img
          src={photoUrl}
          alt="Profile"
          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fe2c55' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgUser?.id ?? 'me'}`; }}
        />
        <h2 style={{ margin: '8px 0 2px', fontSize: 18, color: '#fff' }}>
          {tgUser?.first_name} {tgUser?.last_name ?? ''}
        </h2>
        {tgUser?.username && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>@{tgUser.username}</p>}

        {/* Stats */}
        {profile && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '16px 0' }}>
            {[
              { label: 'Following', value: profile.followingCount },
              { label: 'Followers', value: profile.followerCount },
              { label: 'Likes', value: profile.totalLikes },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Wallet */}
        <div style={{ margin: '12px 0' }}>
          <TonConnectButton />
        </div>
        {wallet && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0' }}>
            <TonIcon size={12} /> {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
          </p>
        )}

        {/* Stars balance */}
        {profile && profile.stars_balance > 0 && (
          <p style={{ fontSize: 13, color: '#ffd700', margin: '8px 0' }}>
            ⭐ {profile.stars_balance} Stars earned
          </p>
        )}

        {/* Creator actions */}
        {profile && !profile.is_creator && (
          <button onClick={handleBecomeCreator}
            style={{ margin: '8px 0', padding: '10px 24px', borderRadius: 20, border: 'none', background: '#fe2c55', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Become a Creator
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 16px' }}>
        <button onClick={handleLoadVideos}
          style={{ padding: '8px 0', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
            color: activeTab === 'videos' ? '#fff' : 'rgba(255,255,255,0.4)',
            borderBottom: activeTab === 'videos' ? '2px solid #fe2c55' : '2px solid transparent' }}>
          Videos
        </button>
        <button onClick={handleLoadLiked}
          style={{ padding: '8px 0', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
            color: activeTab === 'liked' ? '#fff' : 'rgba(255,255,255,0.4)',
            borderBottom: activeTab === 'liked' ? '2px solid #fe2c55' : '2px solid transparent' }}>
          Liked
        </button>
      </div>

      {/* Video grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, padding: 2 }}>
        {videos.map(v => (
          <Link key={v.id} to={`/?startapp=v_${v.id}`} style={{ aspectRatio: '9/16', display: 'block' }}>
            <VideoThumb video={mapApiVideo(v)} />
          </Link>
        ))}
      </div>

      {videos.length === 0 && (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          No videos yet
        </p>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}
