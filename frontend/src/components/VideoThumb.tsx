import { useRef } from 'react';
import type { Video } from '@/data/videos';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface VideoThumbProps {
  video: Video;
  onClick?: () => void;
}

export function VideoThumb({ video, onClick }: VideoThumbProps) {
  const ref = useRef<HTMLVideoElement>(null);

  function handleLoadedMetadata() {
    const el = ref.current;
    if (!el || !el.duration || isNaN(el.duration)) return;
    el.currentTime = Math.min(el.duration * 0.1, 3);
  }

  return (
    <div
      className={`profile-video-thumb${onClick ? ' profile-video-thumb--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <video
        ref={ref}
        src={video.url}
        className="profile-video-preview"
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
      />
      {video.isPrivate && (
        <div className="profile-video-lock">🔒</div>
      )}
      <div className="profile-video-stats">
        <span>❤️ {formatCount(video.likes)}</span>
      </div>
    </div>
  );
}
