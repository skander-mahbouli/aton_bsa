export interface Track {
  id: string;
  title: string;
  category: 'lofi' | 'trap' | 'pop' | 'ambient' | 'trending';
  duration: number; // secondes
  url: string;
  coverColor: string;
}

export const musicCatalog: Track[] = [
  // ── Lo-fi ──────────────────────────────────────────────────────────────────
  { id: 'lofi-1', title: 'Chill Vibes',  category: 'lofi', duration: 120, url: '/music/lofi/chill-vibes.mp3',  coverColor: '#6366f1' },
  { id: 'lofi-2', title: 'Rainy Day',    category: 'lofi', duration: 95,  url: '/music/lofi/rainy-day.mp3',    coverColor: '#8b5cf6' },
  { id: 'lofi-3', title: 'Study Beats',  category: 'lofi', duration: 180, url: '/music/lofi/study-beats.mp3',  coverColor: '#7c3aed' },

  // ── Trap ───────────────────────────────────────────────────────────────────
  { id: 'trap-1', title: 'Hard Bass',    category: 'trap', duration: 110, url: '/music/trap/hard-bass.mp3',    coverColor: '#dc2626' },
  { id: 'trap-2', title: 'Dark Energy',  category: 'trap', duration: 140, url: '/music/trap/dark-energy.mp3',  coverColor: '#b91c1c' },
  { id: 'trap-3', title: 'Bounce',       category: 'trap', duration: 90,  url: '/music/trap/bounce.mp3',       coverColor: '#ef4444' },

  // ── Pop ────────────────────────────────────────────────────────────────────
  { id: 'pop-1',  title: 'Feel Good',    category: 'pop',  duration: 125, url: '/music/pop/feel-good.mp3',     coverColor: '#f59e0b' },
  { id: 'pop-2',  title: 'Summer Hit',   category: 'pop',  duration: 160, url: '/music/pop/summer-hit.mp3',    coverColor: '#d97706' },
  { id: 'pop-3',  title: 'Dance Floor',  category: 'pop',  duration: 145, url: '/music/pop/dance-floor.mp3',   coverColor: '#fbbf24' },

  // ── Ambient ────────────────────────────────────────────────────────────────
  { id: 'ambient-1', title: 'Deep Space',   category: 'ambient', duration: 200, url: '/music/ambient/deep-space.mp3',   coverColor: '#0ea5e9' },
  { id: 'ambient-2', title: 'Nature Flow',  category: 'ambient', duration: 175, url: '/music/ambient/nature-flow.mp3',  coverColor: '#0284c7' },
  { id: 'ambient-3', title: 'Calm Waves',   category: 'ambient', duration: 190, url: '/music/ambient/calm-waves.mp3',   coverColor: '#38bdf8' },

  // ── Trending ───────────────────────────────────────────────────────────────
  { id: 'trending-1', title: 'Viral Sound #1', category: 'trending', duration: 30, url: '/music/trending/viral-sound-1.mp3', coverColor: '#ec4899' },
  { id: 'trending-2', title: 'Viral Sound #2', category: 'trending', duration: 45, url: '/music/trending/viral-sound-2.mp3', coverColor: '#db2777' },
  { id: 'trending-3', title: 'Viral Sound #3', category: 'trending', duration: 60, url: '/music/trending/viral-sound-3.mp3', coverColor: '#f472b6' },
];
