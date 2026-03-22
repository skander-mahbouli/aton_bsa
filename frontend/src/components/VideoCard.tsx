import { useEffect, useRef, useState } from 'react';
import { CreatorOverlay } from '@/components/CreatorOverlay';
import { CommentsDrawer } from '@/components/CommentsDrawer';
import type { Video } from '@/data/videos';

interface VideoCardProps {
  video: Video;
  isActive: boolean;
}

export function VideoCard({ video, isActive }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive && !showComments) {
      el.play().catch(() => {});
      setPaused(false);
    } else {
      el.pause();
      if (!isActive) {
        el.currentTime = 0;
        setPaused(false);
      }
    }
  }, [isActive, showComments]);

  function handleVideoClick() {
    if (showComments) return;
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPaused(false);
    } else {
      el.pause();
      setPaused(true);
    }
  }

  const creatorTelegramId = video.dynamicCreator?.telegramUserId;

  return (
    <div className="video-card">
      <video
        ref={videoRef}
        src={video.url}
        className="video-element"
        loop
        muted
        playsInline
        onClick={handleVideoClick}
      />

      {paused && !showComments && (
        <div className="pause-overlay" onClick={handleVideoClick}>
          <div className="pause-icon">
            <span /><span />
          </div>
        </div>
      )}

      <CreatorOverlay video={video} onShowComments={() => setShowComments(true)} />

      {showComments && (
        <CommentsDrawer
          videoId={video.id}
          creatorTelegramId={creatorTelegramId}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
