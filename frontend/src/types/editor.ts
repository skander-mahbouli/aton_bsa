import type { Track } from '@/data/musicCatalog';

export interface PostDraft {
  videoFile: File;
  videoUrl: string;
  trimStart: number;
  trimEnd: number;
  selectedTrack: Track | null;
  musicVolume: number; // 0-1  (0 = full original audio, 1 = full music)
  description: string;
  isPrivate: boolean;
}
