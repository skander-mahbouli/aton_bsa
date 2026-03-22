import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { VideoFeed } from '@/components/VideoFeed';
import api from '@/lib/api';
import type { Video as ApiVideo } from '@/types';
import { mapApiVideo } from '@/hooks/useVideos';
import type { Video } from '@/data/videos';

export function UserFeedPage() {
  const { telegramUserId } = useParams();
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (!telegramUserId) return;
    api.get<{ videos: ApiVideo[] }>(`/api/users/${telegramUserId}/videos`)
      .then(res => setVideos(res.data.videos.map(mapApiVideo)))
      .catch(() => {});
  }, [telegramUserId]);

  return (
    <div className="feed-page">
      <div className="top-bar">
        <Link to={`/user/${telegramUserId}`} className="back-button">← Profile</Link>
        <span className="app-logo">Videos</span>
        <div style={{ width: 72 }} />
      </div>
      <VideoFeed videos={videos} />
    </div>
  );
}
