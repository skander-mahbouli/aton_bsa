import { useRef, useEffect, useState, useCallback } from 'react';
import { useUiStore } from '../store/uiStore';
import api from '../lib/api';
import PaidContentOverlay from './PaidContentOverlay';
import TokenGatedOverlay from './TokenGatedOverlay';
import type { Video } from '../types';

interface Props {
    video: Video;
    isActive: boolean;
    onLike: () => void;
    onComment: () => void;
    onShare: () => void;
    onTip: () => void;
}

export default function VideoSlide({ video, isActive, onLike, onComment, onShare, onTip }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { soundEnabled, setSoundEnabled } = useUiStore();
    const [paused, setPaused] = useState(false);
    const [showPause, setShowPause] = useState(false);
    const [showHeart, setShowHeart] = useState(false);
    const [unlocked, setUnlocked] = useState(video.isUnlocked || false);

    const isPaid = video.visibility === 'paid' && video.star_price && !unlocked;
    const isTokenGated = video.visibility === 'token_gated' && video.required_token && !unlocked;
    const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });
    const lastTapRef = useRef(0);
    const viewTrackedRef = useRef(false);

    // Play/pause based on active state
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;

        if (isActive) {
            el.muted = !soundEnabled;
            el.play().catch(() => {});
            setPaused(false);

            // Track view after 3 seconds
            if (!viewTrackedRef.current) {
                const timer = setTimeout(() => {
                    api.post(`/api/videos/${video.id}/view`).catch(() => {});
                    viewTrackedRef.current = true;
                }, 3000);
                return () => clearTimeout(timer);
            }
        } else {
            el.pause();
            el.currentTime = 0;
            viewTrackedRef.current = false;
        }
    }, [isActive, video.id, soundEnabled]);

    // Update muted state when sound changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = !soundEnabled;
        }
    }, [soundEnabled]);

    const handleTap = useCallback((e: React.MouseEvent) => {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;
        lastTapRef.current = now;

        if (timeSinceLastTap < 300) {
            // Double tap — like + heart animation
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
            onLike();
            return;
        }

        // Single tap (debounced) — toggle play/pause or unmute
        setTimeout(() => {
            if (Date.now() - lastTapRef.current < 300) return; // was double tap

            if (!soundEnabled) {
                setSoundEnabled(true);
                return;
            }

            const el = videoRef.current;
            if (!el) return;

            if (el.paused) {
                el.play().catch(() => {});
                setPaused(false);
            } else {
                el.pause();
                setPaused(true);
                setShowPause(true);
                setTimeout(() => setShowPause(false), 600);
            }
        }, 300);
    }, [soundEnabled, setSoundEnabled, onLike]);

    return (
        <div className="relative h-screen w-full snap-start snap-always flex-shrink-0" style={{ scrollSnapAlign: 'start' }}>
            <video
                ref={videoRef}
                src={video.video_url}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                playsInline
                muted
                preload="auto"
                poster={video.thumbnail_url || undefined}
            />

            {/* Paid / Token-gated overlays */}
            {isPaid && <PaidContentOverlay video={video} onUnlocked={() => setUnlocked(true)} />}
            {isTokenGated && <TokenGatedOverlay video={video} />}

            {/* Tap area */}
            {!isPaid && !isTokenGated && <div className="absolute inset-0 z-10" onClick={handleTap} />}

            {/* Pause icon */}
            {showPause && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="bg-black/40 rounded-full p-4">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Double-tap heart */}
            {showHeart && (
                <div className="absolute z-20 pointer-events-none"
                    style={{ left: heartPos.x - 40, top: heartPos.y - 40 }}>
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="#ff2d55"
                        className="animate-ping" style={{ animationDuration: '0.6s', animationIterationCount: '1' }}>
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                </div>
            )}

            {/* Muted indicator */}
            {isActive && !soundEnabled && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/50 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                    Tap to unmute
                </div>
            )}

            {/* Right action bar */}
            <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
                {/* Like */}
                <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="flex flex-col items-center gap-1 bg-transparent border-none">
                    <svg width="28" height="28" viewBox="0 0 24 24"
                        fill={video.isLiked ? '#ff2d55' : 'none'}
                        stroke={video.isLiked ? '#ff2d55' : 'white'}
                        strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                    <span className="text-white text-xs drop-shadow">{video.like_count}</span>
                </button>

                {/* Comment */}
                <button onClick={(e) => { e.stopPropagation(); onComment(); }} className="flex flex-col items-center gap-1 bg-transparent border-none">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    <span className="text-white text-xs drop-shadow">{video.comment_count}</span>
                </button>

                {/* Share */}
                <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="flex flex-col items-center gap-1 bg-transparent border-none">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    <span className="text-white text-xs drop-shadow">{video.share_count}</span>
                </button>

                {/* Tip */}
                <button onClick={(e) => { e.stopPropagation(); onTip(); }} className="flex flex-col items-center gap-1 bg-transparent border-none">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className="text-white text-xs drop-shadow">Tip</span>
                </button>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-16 left-3 right-16 z-20">
                <p className="text-white font-bold text-sm drop-shadow">
                    {video.creator_name || 'Unknown'}
                </p>
                <p className="text-white text-xs mt-1 line-clamp-2 drop-shadow">
                    {(video.caption || '').split(/(#\w+)/g).map((part, i) =>
                        part.startsWith('#') ? (
                            <span key={i} style={{ color: 'var(--tg-link)' }}>{part}</span>
                        ) : (
                            <span key={i}>{part}</span>
                        )
                    )}
                </p>
                {video.registration_tx && (
                    <div className="flex items-center gap-1 mt-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span className="text-[10px] text-green-400">Verified on TON</span>
                    </div>
                )}
            </div>

            {/* Paused overlay for inactive */}
            {paused && isActive && (
                <div className="absolute inset-0 bg-black/20 z-5 pointer-events-none" />
            )}
        </div>
    );
}
