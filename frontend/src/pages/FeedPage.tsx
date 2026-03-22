import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSignal, initData, useLaunchParams } from '@tma.js/sdk-react';

import { FeedTabs, type FeedTab } from '@/components/FeedTabs';
import { VideoFeed } from '@/components/VideoFeed';
import { RecordButton } from '@/components/RecordButton';
import { TokGramLogo } from '@/components/TokGramLogo';
import { useVideos } from '@/hooks/useVideos';

export function FeedPage() {
  const [activeTab, setActiveTab] = useState<FeedTab>('foryou');
  const [feedVersion, setFeedVersion] = useState(0);
  const tgUser = useSignal(initData.user);
  const lp = useLaunchParams();
  const avatarUrl =
    tgUser?.photo_url ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgUser?.id ?? 'me'}`;

  const { videos, refetch } = useVideos();

  // Fetch on mount and tab change
  useEffect(() => {
    refetch(activeTab);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link: startapp=v_<id>
  const initialIndex = useMemo(() => {
    const startParam = lp.tgWebAppStartParam;
    if (!startParam?.startsWith('v_')) return 0;
    const videoId = startParam.slice(2);
    const idx = videos.findIndex((v) => v.id === videoId || v.id === `user_${videoId}`);
    return idx >= 0 ? idx : 0;
  }, [lp.tgWebAppStartParam, videos]);

  function handleTabChange(tab: FeedTab) {
    if (tab === activeTab) {
      refetch(activeTab);
      setFeedVersion((v) => v + 1);
      return;
    }
    setActiveTab(tab);
    setFeedVersion((v) => v + 1);
  }

  const feedKey = `${activeTab}-${feedVersion}`;

  return (
    <div className="feed-page">
      <div className="top-bar">
        <Link to="/me" className="top-bar-logo-group" aria-label="My profile">
          <TokGramLogo />
          <img
            src={avatarUrl}
            className="my-avatar-circle"
            alt="My profile"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgUser?.id ?? 'me'}`;
            }}
          />
        </Link>
        <FeedTabs
          active={activeTab}
          onChange={handleTabChange}
          communityCount={0}
        />
        <div style={{ width: 40 }} />
      </div>

      <VideoFeed key={feedKey} videos={videos} initialIndex={activeTab === 'foryou' ? initialIndex : 0} />
      <RecordButton onPublished={() => refetch(activeTab)} />
    </div>
  );
}
