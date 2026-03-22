import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import VideoSlide from '../components/VideoSlide';
import type { Video } from '../types';

type FeedTab = 'following' | 'foryou' | 'trending';

export default function FeedPage() {
    const [tab, setTab] = useState<FeedTab>('foryou');
    const [videos, setVideos] = useState<Video[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const user = useAuthStore((s) => s.user);

    const fetchVideos = useCallback(async (feedTab: FeedTab, pageNum: number, replace: boolean) => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await api.get<{ videos: Video[]; page: number; limit: number }>('/api/videos', {
                params: { feed: feedTab, page: pageNum, limit: 20 },
            });
            const newVideos = res.data.videos;
            setVideos((prev) => replace ? newVideos : [...prev, ...newVideos]);
            setHasMore(newVideos.length >= 20);
            setPage(pageNum);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [loading]);

    // Fetch on mount and tab change
    useEffect(() => {
        setVideos([]);
        setActiveIndex(0);
        setPage(0);
        setHasMore(true);
        fetchVideos(tab, 0, true);
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    // Infinite scroll via IntersectionObserver on sentinel
    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasMore && !loading) {
                    fetchVideos(tab, page + 1, false);
                }
            },
            { threshold: 0.1 },
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, tab, page]); // eslint-disable-line react-hooks/exhaustive-deps

    // Track active slide via IntersectionObserver
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observers: IntersectionObserver[] = [];
        const slides = container.querySelectorAll('[data-slide-index]');

        slides.forEach((slide) => {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
                        const idx = parseInt(slide.getAttribute('data-slide-index') || '0', 10);
                        setActiveIndex(idx);
                    }
                },
                { root: container, threshold: 0.8 },
            );
            observer.observe(slide);
            observers.push(observer);
        });

        return () => observers.forEach((o) => o.disconnect());
    }, [videos]);

    const handleLike = async (video: Video, index: number) => {
        try {
            const res = await api.post<{ liked: boolean; likeCount: number }>(`/api/videos/${video.id}/like`);
            setVideos((prev) =>
                prev.map((v, i) => i === index ? { ...v, isLiked: res.data.liked, like_count: res.data.likeCount } : v),
            );
        } catch {
            // ignore
        }
    };

    const handleShare = async (video: Video) => {
        try {
            const WebApp = (await import('@twa-dev/sdk')).default;
            const botUsername = import.meta.env.VITE_BOT_USERNAME;
            if (botUsername) {
                const url = `https://t.me/${botUsername}/app?startapp=v_${video.id}`;
                WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent((video.caption || '').slice(0, 100))}`);
            }
            api.post(`/api/videos/${video.id}/share`).catch(() => {});
        } catch {
            // ignore
        }
    };

    if (videos.length === 0 && !loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 px-4"
                style={{ color: 'var(--tg-hint)' }}>
                <p className="text-lg">No videos yet</p>
                <p className="text-sm">Be the first to post!</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="fixed top-0 left-0 right-0 z-30 flex justify-center gap-4 pt-3 pb-2"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }}>
                {(['following', 'foryou', 'trending'] as FeedTab[]).map((t) => (
                    <button key={t}
                        onClick={() => setTab(t)}
                        className={`text-sm font-semibold bg-transparent border-none cursor-pointer px-2 pb-1 ${tab === t ? 'text-white border-b-2 border-white' : 'text-white/60'}`}
                        style={tab === t ? { borderBottom: '2px solid white' } : {}}>
                        {t === 'foryou' ? 'For You' : t === 'following' ? 'Following' : 'Trending'}
                    </button>
                ))}
            </div>

            {/* Video feed */}
            <div ref={containerRef}
                className="flex-1 overflow-y-scroll overflow-x-hidden"
                style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}>
                {videos.map((video, index) => (
                    <div key={video.id} data-slide-index={index}>
                        <VideoSlide
                            video={video}
                            isActive={index === activeIndex}
                            onLike={() => handleLike(video, index)}
                            onComment={() => {/* Module 18 */}}
                            onShare={() => handleShare(video)}
                            onTip={() => {/* Module 19 */}}
                        />
                    </div>
                ))}

                {/* Sentinel for infinite scroll */}
                <div ref={sentinelRef} className="h-1" />
            </div>
        </div>
    );
}
