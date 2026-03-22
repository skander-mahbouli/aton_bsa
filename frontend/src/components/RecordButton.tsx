import { useState } from 'react';
import type { Track } from '@/data/musicCatalog';
import type { PostDraft } from '@/types/editor';
import { VideoUpload }  from './VideoUpload';
import { VideoEditor }  from './VideoEditor';
import { MusicPicker }  from './MusicPicker';
import { VideoPreview } from './VideoPreview';

type Step = 'idle' | 'upload' | 'edit' | 'music' | 'preview';

interface RecordButtonProps {
  onPublished: () => void;
}

export function RecordButton({ onPublished }: RecordButtonProps) {
  const [step, setStep]   = useState<Step>('idle');
  const [draft, setDraft] = useState<PostDraft | null>(null);

  function updateDraft(updates: Partial<PostDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...updates } : null));
  }

  // Step 1 → 2: video selected
  function handleVideoSelected(file: File, url: string) {
    setDraft({
      videoFile: file,
      videoUrl:  url,
      trimStart: 0,
      trimEnd:   60,
      selectedTrack: null,
      musicVolume:   0.7,
      description:   '',
      isPrivate:     false,
    });
    setStep('edit');
  }

  // Step 2 → 3: trim done
  function handleTrimDone(trimStart: number, trimEnd: number) {
    updateDraft({ trimStart, trimEnd });
    setStep('music');
  }

  // Step 3 → 4: music picked (or null)
  function handleMusicDone(track: Track | null) {
    updateDraft({ selectedTrack: track });
    setStep('preview');
  }

  // Reset everything
  function handleClose() {
    if (draft?.videoUrl) URL.revokeObjectURL(draft.videoUrl);
    setDraft(null);
    setStep('idle');
  }

  return (
    <>
      {/* The "+" button always present in the feed */}
      <button
        className="record-btn"
        onClick={() => setStep('upload')}
        aria-label="Créer une vidéo"
      >
        <span className="record-btn-inner">+</span>
      </button>

      {step === 'upload' && (
        <VideoUpload onNext={handleVideoSelected} onClose={handleClose} />
      )}

      {step === 'edit' && draft && (
        <VideoEditor
          videoUrl={draft.videoUrl}
          onNext={handleTrimDone}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'music' && draft && (
        <MusicPicker
          selected={draft.selectedTrack}
          onNext={handleMusicDone}
          onBack={() => setStep('edit')}
        />
      )}

      {step === 'preview' && draft && (
        <VideoPreview
          draft={draft}
          onBack={() => setStep('music')}
          onPublished={() => { onPublished(); handleClose(); }}
          onUpdateDraft={updateDraft}
        />
      )}
    </>
  );
}
