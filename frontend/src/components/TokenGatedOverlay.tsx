import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useNavigate } from 'react-router-dom';
import type { Video } from '../types';

interface Props {
    video: Video;
}

export default function TokenGatedOverlay({ video }: Props) {
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    const navigate = useNavigate();

    let tokenInfo: { address: string; symbol: string; minBalance: string } | null = null;
    try {
        tokenInfo = video.required_token ? JSON.parse(video.required_token) : null;
    } catch {
        // ignore
    }

    if (!tokenInfo) return null;

    if (!wallet) {
        return (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4">
                <div className="absolute inset-0"
                    style={{
                        backgroundImage: video.thumbnail_url ? `url(${video.thumbnail_url})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(30px) brightness(0.5)',
                    }}
                />
                <div className="relative z-10 flex flex-col items-center gap-4">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <p className="text-white text-sm">Connect wallet to view</p>
                    <button
                        onClick={() => tonConnectUI.openModal()}
                        className="px-6 py-3 rounded-full font-semibold text-sm"
                        style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    // Wallet connected but no access
    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4">
            <div className="absolute inset-0"
                style={{
                    backgroundImage: video.thumbnail_url ? `url(${video.thumbnail_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(30px) brightness(0.5)',
                }}
            />
            <div className="relative z-10 flex flex-col items-center gap-4 text-center px-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <p className="text-white text-sm">
                    You need {tokenInfo.minBalance} ${tokenInfo.symbol} to view this
                </p>
                <button
                    onClick={() => navigate(`/profile/${video.creator_id}`)}
                    className="px-6 py-3 rounded-full font-semibold text-sm"
                    style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                    Buy Tokens
                </button>
            </div>
        </div>
    );
}
