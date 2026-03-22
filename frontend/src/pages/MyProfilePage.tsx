import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignal, initData } from '@tma.js/sdk-react';
import { useTonWallet, TonConnectButton } from '@tonconnect/ui-react';
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
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<ApiVideo[]>([]);
  const [activeTab, setActiveTab] = useState<'videos' | 'liked'>('videos');
  const [showLaunchToken, setShowLaunchToken] = useState(false);
  const [showNftDeploy, setShowNftDeploy] = useState(false);
  const wallet = useTonWallet();

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
    <div className="profile-page" style={{ paddingTop: 'calc(var(--safe-area-top, 0px) + 48px)' }}>
      {/* Back button - fixed position below Telegram header */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed', top: 'calc(var(--safe-area-top, 0px) + 8px)', left: 12, zIndex: 100,
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 20,
          padding: '6px 16px', color: '#fff', fontSize: 14, cursor: 'pointer',
        }}>
        ← Feed
      </button>

      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <img src={photoUrl} alt="Profile"
          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fe2c55' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgUser?.id ?? 'me'}`; }}
        />
        <h2 style={{ margin: '8px 0 2px', fontSize: 18, color: '#fff' }}>
          {tgUser?.first_name} {tgUser?.last_name ?? ''}
        </h2>
        {tgUser?.username && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>@{tgUser.username}</p>}

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
        <div style={{ margin: '12px 0', display: 'flex', justifyContent: 'center' }}>
          <TonConnectButton />
        </div>

        {/* Stars balance */}
        {profile && profile.stars_balance > 0 && (
          <p style={{ fontSize: 13, color: '#ffd700', margin: '8px 0' }}>
            ⭐ {profile.stars_balance} Stars earned
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', margin: '12px 0' }}>
          {profile && !profile.is_creator && (
            <button onClick={handleBecomeCreator}
              style={{ padding: '10px 20px', borderRadius: 20, border: 'none', background: '#fe2c55', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              Become Creator
            </button>
          )}
          {profile?.is_creator === 1 && !profile.jetton_address && (
            <button onClick={() => setShowLaunchToken(true)}
              style={{ padding: '10px 20px', borderRadius: 20, border: 'none', background: '#0a84ff', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              🪙 Launch Token
            </button>
          )}
          {profile?.is_creator === 1 && (
            <button onClick={() => setShowNftDeploy(true)}
              style={{ padding: '10px 20px', borderRadius: 20, border: 'none', background: '#2c2c2e', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              🎨 Deploy NFT
            </button>
          )}
        </div>

        {/* Token info */}
        {profile?.jetton_name && (
          <div style={{ background: '#1c1c1e', borderRadius: 12, padding: '8px 16px', margin: '8px auto', display: 'inline-block' }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>${profile.jetton_symbol}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 8 }}>{profile.jetton_name}</span>
          </div>
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
          <div key={v.id} style={{ aspectRatio: '9/16', cursor: 'pointer' }}
            onClick={() => navigate(`/?startapp=v_${v.id}`)}>
            <VideoThumb video={mapApiVideo(v)} />
          </div>
        ))}
      </div>

      {videos.length === 0 && (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          No videos yet
        </p>
      )}

      <div style={{ height: 80 }} />

      {/* Launch Token Modal */}
      {showLaunchToken && (
        <LaunchTokenInline
          onClose={() => setShowLaunchToken(false)}
          onSuccess={(addr, name, sym) => {
            setProfile(p => p ? { ...p, jetton_address: addr, jetton_name: name, jetton_symbol: sym } : p);
            setShowLaunchToken(false);
          }}
        />
      )}

      {/* NFT Deploy Modal */}
      {showNftDeploy && (
        <NftDeployInline onClose={() => setShowNftDeploy(false)} />
      )}
    </div>
  );
}

// Inline Launch Token using our existing logic
function LaunchTokenInline({ onClose, onSuccess }: { onClose: () => void; onSuccess: (addr: string, name: string, sym: string) => void }) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [deploying, setDeploying] = useState(false);
  const wallet = useTonWallet();

  async function handleDeploy() {
    if (!wallet || !name || !symbol) return;
    setDeploying(true);
    try {
      const { Address, beginCell, toNano, Dictionary, contractAddress } = await import('@ton/ton');
      const { JettonMinter } = await import('@/contracts/JettonMinter_JettonMinter');
      const { useTonConnectUI } = await import('@tonconnect/ui-react');

      const ownerAddress = Address.parse(wallet.account.address);
      const encoder = new TextEncoder();
      const nameKey = BigInt('0x' + Array.from(encoder.encode('name')).map(b => b.toString(16).padStart(2, '0')).join('').padStart(64, '0'));
      const symbolKey = BigInt('0x' + Array.from(encoder.encode('symbol')).map(b => b.toString(16).padStart(2, '0')).join('').padStart(64, '0'));
      const imageKey = BigInt('0x' + Array.from(encoder.encode('image')).map(b => b.toString(16).padStart(2, '0')).join('').padStart(64, '0'));

      const nameCell = beginCell().storeUint(0, 8).storeStringTail(name).endCell();
      const symbolCell = beginCell().storeUint(0, 8).storeStringTail(symbol.toUpperCase()).endCell();
      const imageCell = beginCell().storeUint(0, 8).storeStringTail(imageUrl || '').endCell();

      const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
      dict.set(nameKey, nameCell);
      dict.set(symbolKey, symbolCell);
      dict.set(imageKey, imageCell);

      const content = beginCell().storeUint(0x00, 8).storeDict(dict).endCell();
      const minter = await JettonMinter.fromInit(ownerAddress, content);
      const stateInit = minter.init!;
      const stateInitCell = beginCell()
        .storeBit(false).storeBit(false).storeBit(true).storeRef(stateInit.code)
        .storeBit(true).storeRef(stateInit.data).storeBit(false).endCell();

      // Access TonConnect UI from window (can't use hook here)
      const tc = (window as any).__tonConnectUI;
      if (tc) {
        await tc.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [{ address: minter.address.toRawString(), amount: toNano('0.1').toString(), stateInit: stateInitCell.toBoc().toString('base64') }],
        });
        await api.patch('/api/users/me', { jettonAddress: minter.address.toString(), jettonName: name, jettonSymbol: symbol.toUpperCase() });
        onSuccess(minter.address.toString(), name, symbol.toUpperCase());
      }
    } catch { /* user rejected */ }
    finally { setDeploying(false); }
  }

  return (
    <div className="comments-overlay" onClick={onClose}>
      <div className="comments-drawer" style={{ maxHeight: '50vh' }} onClick={e => e.stopPropagation()}>
        <div className="comments-handle-bar" />
        <div className="comments-header">
          <span className="comments-title">🪙 Launch Token</span>
          <button className="comments-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Token Name"
            style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#2c2c2e', color: '#fff', fontSize: 14 }} />
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase().slice(0, 8))} placeholder="Symbol (e.g. TIKN)" maxLength={8}
            style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#2c2c2e', color: '#fff', fontSize: 14 }} />
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Icon URL (optional)"
            style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#2c2c2e', color: '#fff', fontSize: 14 }} />
          <button onClick={handleDeploy} disabled={deploying || !wallet || !name || !symbol}
            style={{ padding: '12px', borderRadius: 12, border: 'none', background: '#0a84ff', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: deploying ? 0.5 : 1 }}>
            {deploying ? 'Deploying...' : 'Deploy Token'}
          </button>
          {!wallet && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Connect wallet first</p>}
        </div>
      </div>
    </div>
  );
}

function NftDeployInline({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [maxSupply, setMaxSupply] = useState('100');
  const [mintPrice, setMintPrice] = useState('0.5');
  const [deploying, setDeploying] = useState(false);
  const wallet = useTonWallet();

  async function handleDeploy() {
    if (!wallet || !name) return;
    setDeploying(true);
    try {
      const { Address, beginCell, toNano } = await import('@ton/ton');
      const { NftCollection } = await import('@/contracts/NftCollection_NftCollection');

      const ownerAddress = Address.parse(wallet.account.address);
      const content = beginCell().storeUint(0x01, 8)
        .storeStringTail(JSON.stringify({ name, description, image: imageUrl })).endCell();

      const collection = await NftCollection.fromInit(ownerAddress, content, toNano(mintPrice), BigInt(maxSupply));
      const stateInit = collection.init!;
      const stateInitCell = beginCell()
        .storeBit(false).storeBit(false).storeBit(true).storeRef(stateInit.code)
        .storeBit(true).storeRef(stateInit.data).storeBit(false).endCell();

      const tc = (window as any).__tonConnectUI;
      if (tc) {
        await tc.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [{ address: collection.address.toRawString(), amount: toNano('0.1').toString(), stateInit: stateInitCell.toBoc().toString('base64') }],
        });
        await api.post('/api/nft-collections', {
          name, imageUrl, contractAddress: collection.address.toString(),
          maxSupply: parseInt(maxSupply), mintPriceTon: mintPrice,
        });
        onClose();
      }
    } catch { /* user rejected */ }
    finally { setDeploying(false); }
  }

  return (
    <div className="comments-overlay" onClick={onClose}>
      <div className="comments-drawer" style={{ maxHeight: '55vh' }} onClick={e => e.stopPropagation()}>
        <div className="comments-handle-bar" />
        <div className="comments-header">
          <span className="comments-title">🎨 Deploy NFT Collection</span>
          <button className="comments-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Collection Name"
            style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#2c2c2e', color: '#fff', fontSize: 14 }} />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
            style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#2c2c2e', color: '#fff', fontSize: 14 }} />
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Cover image URL"
            style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#2c2c2e', color: '#fff', fontSize: 14 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={maxSupply} onChange={e => setMaxSupply(e.target.value)} placeholder="Max supply" type="number"
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#2c2c2e', color: '#fff', fontSize: 14 }} />
            <input value={mintPrice} onChange={e => setMintPrice(e.target.value)} placeholder="Price (TON)" type="number" step="0.1"
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#2c2c2e', color: '#fff', fontSize: 14 }} />
          </div>
          <button onClick={handleDeploy} disabled={deploying || !wallet || !name}
            style={{ padding: '12px', borderRadius: 12, border: 'none', background: '#fe2c55', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: deploying ? 0.5 : 1 }}>
            {deploying ? 'Deploying...' : 'Deploy Collection'}
          </button>
          {!wallet && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Connect wallet first</p>}
        </div>
      </div>
    </div>
  );
}
