export type FeedTab = 'foryou' | 'following' | 'communities';

interface FeedTabsProps {
  active: FeedTab;
  onChange: (tab: FeedTab) => void;
  communityCount: number; // number of subscribed communities
}

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'following', label: 'Following' },
  { id: 'foryou', label: 'For You' },
  { id: 'communities', label: 'Trending' },
];

export function FeedTabs({ active, onChange, communityCount }: FeedTabsProps) {
  return (
    <div className="feed-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`feed-tab${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.id === 'communities' && communityCount > 0 && (
            <span className="feed-tab-badge">{communityCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}
