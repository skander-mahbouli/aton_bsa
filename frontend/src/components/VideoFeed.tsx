import { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';

import { VideoCard } from '@/components/VideoCard';
import type { Video } from '@/data/videos';

interface VideoFeedProps {
  videos: Video[];
  initialIndex?: number;
}

export function VideoFeed({ videos, initialIndex = 0 }: VideoFeedProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    if (!swiperRef.current || initialIndex === 0) return;
    swiperRef.current.slideTo(initialIndex, 0);
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  function handleSlideChange(swiper: SwiperType) {
    setActiveIndex(swiper.activeIndex);
  }

  if (videos.length === 0) {
    return (
      <div className="feed-empty">
        <p>No videos here yet.</p>
      </div>
    );
  }

  return (
    <Swiper
      direction="vertical"
      className="video-feed"
      onSwiper={(s) => { swiperRef.current = s; }}
      onSlideChange={handleSlideChange}
      initialSlide={initialIndex}
      speed={300}
      touchRatio={1}
      threshold={10}
    >
      {videos.map((video, index) => (
        <SwiperSlide key={video.id} className="video-slide">
          <VideoCard video={video} isActive={activeIndex === index} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
