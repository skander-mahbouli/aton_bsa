import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface SearchUser {
    id: number;
    name: string;
    username: string | null;
    photo_url: string | null;
    is_creator: number;
}

interface SearchVideo {
    id: number;
    caption: string;
    thumbnail_url: string | null;
    view_count: number;
    like_count: number;
    creator_name: string;
    creator_username: string | null;
}

interface TrendingHashtag {
    hashtag: string;
    count: number;
}

export default function ExplorePage() {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<SearchUser[]>([]);
    const [videos, setVideos] = useState<SearchVideo[]>([]);
    const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
    const [searching, setSearching] = useState(false);
    const navigate = useNavigate();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        api.get<{ hashtags: TrendingHashtag[] }>('/api/search/trending-hashtags')
            .then((res) => setHashtags(res.data.hashtags))
            .catch(() => {});
    }, []);

    const handleSearch = (q: string) => {
        setQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!q.trim()) {
            setUsers([]);
            setVideos([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.get<{ users: SearchUser[]; videos: SearchVideo[] }>('/api/search', {
                    params: { q },
                });
                setUsers(res.data.users);
                setVideos(res.data.videos);
            } catch {
                // ignore
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const hasResults = users.length > 0 || videos.length > 0;
    const showTrending = !query.trim() && hashtags.length > 0;

    return (
        <div className="h-full overflow-y-auto" style={{ backgroundColor: 'var(--tg-bg)' }}>
            {/* Search bar */}
            <div className="px-4 pt-4 pb-2">
                <input
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search creators and videos..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-transparent outline-none"
                    style={{ backgroundColor: 'var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                />
            </div>

            {/* Trending hashtags */}
            {showTrending && (
                <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--tg-hint)' }}>Trending</h3>
                    <div className="flex flex-wrap gap-2">
                        {hashtags.map((h) => (
                            <button key={h.hashtag}
                                onClick={() => handleSearch(`#${h.hashtag}`)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: 'var(--tg-secondary-bg)', color: 'var(--tg-link)' }}>
                                #{h.hashtag} <span style={{ color: 'var(--tg-hint)' }}>{h.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading */}
            {searching && (
                <p className="text-center text-sm py-8" style={{ color: 'var(--tg-hint)' }}>Searching...</p>
            )}

            {/* No results */}
            {query.trim() && !searching && !hasResults && (
                <p className="text-center text-sm py-8" style={{ color: 'var(--tg-hint)' }}>No results found</p>
            )}

            {/* User results */}
            {users.length > 0 && (
                <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--tg-hint)' }}>Creators</h3>
                    <div className="flex flex-col gap-2">
                        {users.map((u) => (
                            <button key={u.id}
                                onClick={() => navigate(`/profile/${u.id}`)}
                                className="flex items-center gap-3 p-2 rounded-xl bg-transparent border-none cursor-pointer text-left w-full"
                                style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                    style={{ backgroundColor: 'var(--tg-button)' }}>
                                    {u.photo_url
                                        ? <img src={u.photo_url} className="w-full h-full rounded-full object-cover" />
                                        : (u.name || '?')[0].toUpperCase()
                                    }
                                </div>
                                <div>
                                    <p className="font-semibold text-sm" style={{ color: 'var(--tg-text)' }}>{u.name}</p>
                                    {u.username && <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>@{u.username}</p>}
                                </div>
                                {u.is_creator === 1 && (
                                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                                        Creator
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Video results */}
            {videos.length > 0 && (
                <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--tg-hint)' }}>Videos</h3>
                    <div className="grid grid-cols-3 gap-0.5">
                        {videos.map((v) => (
                            <div key={v.id}
                                className="aspect-[9/16] relative cursor-pointer"
                                onClick={() => navigate(`/?video=${v.id}`)}>
                                {v.thumbnail_url ? (
                                    <img src={v.thumbnail_url} className="w-full h-full object-cover rounded" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center rounded"
                                        style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tg-hint)" strokeWidth="2">
                                            <polygon points="5 3 19 12 5 21 5 3" />
                                        </svg>
                                    </div>
                                )}
                                <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                    <span className="text-white text-[9px] drop-shadow">{v.view_count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="h-4" />
        </div>
    );
}
