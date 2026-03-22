import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { VideoThumb } from '@/components/VideoThumb';
import api from '@/lib/api';
import type { Video as ApiVideo } from '@/types';
import { mapApiVideo } from '@/hooks/useVideos';

interface UserProfile {
  id: number;
  name: string;
  username: string | null;
  photo_url: string | null;
  bio: string | null;
  is_creator: number;
  wallet_address: string | null;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  totalLikes: number;
  isFollowing?: boolean;
}

export function UserProfilePage() {
  const { telegramUserId } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!telegramUserId) return;
    setLoading(true);
    api.get<UserProfile>(`/api/users/${telegramUserId}`)
      .then(res => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get<{ videos: ApiVideo[] }>(`/api/users/${telegramUserId}/videos`)
      .then(res => setVideos(res.data.videos))
      .catch(() => {});
  }, [telegramUserId]);

  async function handleFollow() {
    if (!profile) return;
    try {
      const res = await api.post<{ following: boolean }>(`/api/users/${profile.id}/follow`);
      setProfile(p => p ? { ...p, isFollowing: res.data.following, followerCount: p.followerCount + (res.data.following ? 1 : -1) } : p);
    } catch { /* ignore */ }
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>;
  }

  if (!profile) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'rgba(255,255,255,0.4)' }}>Profile not found</div>;
  }

  const photoUrl = profile.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${telegramUserId}`;

  return (
    <div className="profile-page">
      <div className="top-bar">
        <Link to="/" className="back-button">← Feed</Link>
        <span className="app-logo">{profile.name}</span>
        <div style={{ width: 72 }} />
      </div>

      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <img src={photoUrl} alt={profile.name}
          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fe2c55' }} />
        <h2 style={{ margin: '8px 0 2px', fontSize: 18, color: '#fff' }}>{profile.name}</h2>
        {profile.username && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>@{profile.username}</p>}
        {profile.bio && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '8px 0' }}>{profile.bio}</p>}

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

        <button onClick={handleFollow}
          style={{
            padding: '10px 32px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            background: profile.isFollowing ? '#2c2c2e' : '#fe2c55', color: '#fff',
          }}>
          {profile.isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, padding: 2 }}>
        {videos.map(v => (
          <Link key={v.id} to={`/user/${telegramUserId}/feed`} style={{ aspectRatio: '9/16', display: 'block' }}>
            <VideoThumb video={mapApiVideo(v)} />
          </Link>
        ))}
      </div>

      {videos.length === 0 && (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No videos yet</p>
      )}
      <div style={{ height: 80 }} />
    </div>
  );
}
