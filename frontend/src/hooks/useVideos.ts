import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Video as ApiVideo } from '@/types';
import type { Video as FeedVideo } from '@/data/videos';

// Convert our backend Video to GramTok's Video format
export function mapApiVideo(v: ApiVideo): FeedVideo {
  return {
    id: String(v.id),
    url: v.video_url,
    creatorId: `tg_${v.creator_id}`,
    tips: 0,
    likes: v.like_count,
    isPrivate: v.visibility === 'subscribers',
    isPremium: v.visibility === 'subscribers' || v.visibility === 'token_gated',
    description: v.caption || '',
    dynamicCreator: {
      name: v.creator_name || 'User',
      username: v.creator_username ? `@${v.creator_username}` : '',
      avatar: v.creator_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.creator_id}`,
      telegramUserId: String(v.creator_id),
      walletAddress: v.creator_wallet || '',
    },
  };
}

export function useVideos() {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetch = useCallback(async (feed: string, pageNum = 0, replace = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.get<{ videos: ApiVideo[] }>('/api/videos', {
        params: { feed, page: pageNum, limit: 20 },
      });
      const mapped = res.data.videos.map(mapApiVideo);
      setVideos(prev => replace ? mapped : [...prev, ...mapped]);
      setHasMore(mapped.length >= 20);
      setPage(pageNum);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const fetchMore = useCallback((feed: string) => {
    if (hasMore && !loading) {
      fetch(feed, page + 1, false);
    }
  }, [fetch, hasMore, loading, page]);

  const refetch = useCallback((feed: string) => {
    setPage(0);
    setHasMore(true);
    fetch(feed, 0, true);
  }, [fetch]);

  return { videos, loading, hasMore, fetch, fetchMore, refetch };
}
