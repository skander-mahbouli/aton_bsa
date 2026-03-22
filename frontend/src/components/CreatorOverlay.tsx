import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartIcon } from '@/components/HeartIcon';
import { ShareIcon } from '@/components/ShareIcon';
import { TonIcon } from '@/components/TonIcon';
import type { Video } from '@/data/videos';
import api from '@/lib/api';

interface CreatorOverlayProps {
  video: Video;
  onShowComments: () => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function CreatorOverlay({ video, onShowComments }: CreatorOverlayProps) {
  const navigate = useNavigate();
  const [likes, setLikes] = useState(video.likes);
  const [liked, setLiked] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [justFollowed, setJustFollowed] = useState(false);

  const creator = {
    name: video.dynamicCreator?.name ?? 'User',
    username: video.dynamicCreator?.username ?? '',
    avatar: video.dynamicCreator?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.creatorId}`,
    telegramUserId: video.dynamicCreator?.telegramUserId,
    walletAddress: video.dynamicCreator?.walletAddress ?? '',
  };

  // Double-tap detection for avatar
  const lastTapRef = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleAvatarTap() {
    const now = Date.now();
    const timeSinceLast = now - lastTapRef.current;

    if (timeSinceLast < 350) {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      lastTapRef.current = 0;
      // Double-tap follow
      const backendUserId = video.creatorId.replace('tg_', '');
      api.post(`/api/users/${backendUserId}/follow`).catch(() => {});
      setJustFollowed(true);
      setTimeout(() => setJustFollowed(false), 1200);
    } else {
      lastTapRef.current = now;
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        if (creator.telegramUserId) {
          navigate(`/user/${creator.telegramUserId}`);
        }
      }, 350);
    }
  }

  async function handleLike() {
    try {
      const videoId = video.id.replace('user_', '');
      const res = await api.post<{ liked: boolean; likeCount: number }>(`/api/videos/${videoId}/like`);
      setLiked(res.data.liked);
      setLikes(res.data.likeCount);
    } catch {
      // Toggle locally as fallback
      setLiked(prev => !prev);
      setLikes(prev => liked ? prev - 1 : prev + 1);
    }
  }

  function handleShare() {
    const botUsername = import.meta.env.VITE_BOT_USERNAME || 'tikton_bot';
    const appUrl = `https://t.me/${botUsername}/app?startapp=v_${video.id}`;
    const text = `Check out this video on TikTon!\n${video.description.slice(0, 80)}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(text)}`;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
    // Track share
    const videoId = video.id.replace('user_', '');
    api.post(`/api/videos/${videoId}/share`).catch(() => {});
  }

  return (
    <>
      {justFollowed && (
        <div className="follow-toast">✓ Following {creator.name}</div>
      )}

      {/* Right sidebar */}
      <div className="right-sidebar">
        <button
          className="sidebar-avatar-btn not-followed"
          onClick={handleAvatarTap}
          aria-label="Double-tap to follow"
        >
          <img src={creator.avatar} alt={creator.name} />
          <span className="avatar-plus">+</span>
        </button>

        <button className="sidebar-action" onClick={handleLike} aria-label="Like">
          <HeartIcon filled={liked} size={30} />
          <span className="action-count">{formatCount(likes)}</span>
        </button>

        <button className="sidebar-action" onClick={() => setShowTip(true)} aria-label="Tip">
          <TonIcon size={28} />
          <span className="action-count">Tip</span>
        </button>

        <button className="sidebar-action" aria-label="Comments" onClick={onShowComments}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="action-count">Comments</span>
        </button>

        <button className="sidebar-action" aria-label="Share" onClick={handleShare}>
          <ShareIcon size={28} />
          <span className="action-count">Share</span>
        </button>
      </div>

      {/* Tip Modal */}
      {showTip && (
        <TipOverlay
          video={video}
          creatorWallet={creator.walletAddress}
          onClose={() => setShowTip(false)}
        />
      )}

      {/* Bottom info */}
      <div className="bottom-info">
        <button
          className="creator-name-btn"
          onClick={() => {
            if (creator.telegramUserId) navigate(`/user/${creator.telegramUserId}`);
          }}
        >
          {creator.name}
        </button>
        <p className="creator-username">{creator.username}</p>
        <p className="video-description">
          {video.isPrivate && <span className="private-badge">🔒</span>}
          {video.description}
        </p>
      </div>
    </>
  );
}

// Inline tip overlay using our TipModal logic
function TipOverlay({ video, creatorWallet, onClose }: { video: Video; creatorWallet: string; onClose: () => void }) {
  const [amount, setAmount] = useState('1');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');

  async function handleStarsTip() {
    try {
      setSending(true);
      const videoId = video.id.replace('user_', '');
      const creatorId = video.creatorId.replace('tg_', '');
      const res = await api.post<{ invoiceUrl: string }>('/api/payments/stars/invoice', {
        type: 'tip',
        videoId: parseInt(videoId),
        creatorId: parseInt(creatorId),
        amount: parseInt(amount),
      });
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openInvoice) {
        tg.openInvoice(res.data.invoiceUrl, (status: string) => {
          if (status === 'paid') {
            setSuccess(`+${amount} Stars!`);
            setTimeout(onClose, 1500);
          }
        });
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  async function handleTonTip() {
    if (!creatorWallet) return;
    const tipJarAddress = import.meta.env.VITE_TIP_JAR_ADDRESS;
    if (!tipJarAddress) return;

    try {
      setSending(true);
      const { beginCell, toNano, Address } = await import('@ton/ton');
      const { useTonConnectUI } = await import('@tonconnect/ui-react');

      const videoId = video.id.replace('user_', '');
      const body = beginCell()
        .storeUint(0x156419be, 32)
        .storeAddress(Address.parse(creatorWallet))
        .storeUint(parseInt(videoId), 64)
        .endCell();

      // Note: we can't use hooks outside React components, so we access TonConnect via window
      const tc = (window as any).__tonConnectUI;
      if (tc) {
        await tc.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [{
            address: tipJarAddress,
            amount: toNano(amount).toString(),
            payload: body.toBoc().toString('base64'),
          }],
        });
        setSuccess(`+${amount} TON!`);
        setTimeout(onClose, 1500);
      }
    } catch {
      // user rejected
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="comments-overlay" onClick={onClose}>
      <div className="comments-drawer" style={{ maxHeight: '45vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="comments-handle-bar" />
        <div className="comments-header">
          <span className="comments-title">Send a tip</span>
          <button className="comments-close" onClick={onClose}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem', fontSize: '1.5rem', color: '#25f4ee' }}>
            {success}
          </div>
        ) : (
          <div style={{ padding: '1rem' }}>
            {/* Amount presets */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {['1', '5', '10', '50', '100'].map(a => (
                <button key={a} onClick={() => setAmount(a)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: amount === a ? '#fe2c55' : '#2c2c2e', color: '#fff', fontSize: 14,
                  }}>
                  {a}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleStarsTip} disabled={sending}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#fe2c55', color: '#fff', fontWeight: 600, opacity: sending ? 0.5 : 1 }}>
                ⭐ {amount} Stars
              </button>
              {creatorWallet && (
                <button onClick={handleTonTip} disabled={sending}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#0a84ff', color: '#fff', fontWeight: 600, opacity: sending ? 0.5 : 1 }}>
                  💎 {amount} TON
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
