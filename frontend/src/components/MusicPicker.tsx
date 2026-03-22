import { useState, useRef, useEffect } from 'react';
import { musicCatalog, type Track } from '@/data/musicCatalog';

const TABS = [
  { id: 'trending', label: '🔥 Trending' },
  { id: 'lofi',     label: 'Lo-fi' },
  { id: 'trap',     label: 'Trap' },
  { id: 'pop',      label: 'Pop' },
  { id: 'ambient',  label: 'Ambient' },
] as const;

interface MusicPickerProps {
  selected: Track | null;
  onNext: (track: Track | null) => void;
  onBack: () => void;
}

function fmt(s: number) {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function MusicPicker({ selected, onNext, onBack }: MusicPickerProps) {
  const [activeTab, setActiveTab] = useState<string>('trending');
  const [search, setSearch]       = useState('');
  const [playing, setPlaying]     = useState<string | null>(null);
  const [current, setCurrent]     = useState<Track | null>(selected);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.addEventListener('ended', () => setPlaying(null));
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const tracks = musicCatalog.filter((t) => {
    const matchCat    = t.category === activeTab;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function togglePlay(track: Track, e: React.MouseEvent) {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing === track.id) {
      audio.pause();
      setPlaying(null);
    } else {
      audio.src = track.url;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      setPlaying(track.id);
    }
  }

  function selectTrack(track: Track | null) {
    const audio = audioRef.current;
    if (audio) { audio.pause(); setPlaying(null); }
    setCurrent(track);
  }

  function handleTab(id: string) {
    setActiveTab(id);
    setSearch('');
    const audio = audioRef.current;
    if (audio) { audio.pause(); setPlaying(null); }
  }

  return (
    <div className="editor-screen">
      {/* Header */}
      <div className="editor-header">
        <button className="editor-back-btn" onClick={onBack}>← Retour</button>
        <span className="editor-title">Sons</span>
        <button className="editor-next-btn" onClick={() => onNext(current)}>
          {current ? 'Utiliser →' : 'Sans son →'}
        </button>
      </div>

      {/* Search */}
      <div className="music-search-wrap">
        <input
          className="music-search-input"
          type="text"
          placeholder="🔍 Rechercher un son…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="music-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`music-tab${activeTab === tab.id ? ' music-tab--active' : ''}`}
            onClick={() => handleTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="music-list">
        {/* "No music" row */}
        <div
          className={`music-track${current === null ? ' music-track--selected' : ''}`}
          onClick={() => selectTrack(null)}
        >
          <div className="music-track-avatar music-track-avatar--none">✕</div>
          <div className="music-track-info">
            <span className="music-track-title">Pas de musique</span>
            <span className="music-track-meta">—</span>
          </div>
          {current === null && <div className="music-track-check">✓</div>}
        </div>

        {/* Tracks */}
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`music-track${current?.id === track.id ? ' music-track--selected' : ''}`}
            onClick={() => selectTrack(track)}
          >
            {/* Play/stop button */}
            <button
              className="music-track-avatar"
              style={{ background: track.coverColor }}
              onClick={(e) => togglePlay(track, e)}
              aria-label={playing === track.id ? 'Stop' : 'Play'}
            >
              {playing === track.id ? (
                <span className="equalizer">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="equalizer-bar"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </span>
              ) : (
                <span className="music-play-icon">▶</span>
              )}
            </button>

            <div className="music-track-info">
              <span className="music-track-title">{track.title}</span>
              <span className="music-track-meta">
                {track.category} · {fmt(track.duration)}
              </span>
            </div>

            {current?.id === track.id && <div className="music-track-check">✓</div>}
          </div>
        ))}

        {tracks.length === 0 && (
          <p className="music-empty">Aucun résultat pour « {search} »</p>
        )}
      </div>
    </div>
  );
}
