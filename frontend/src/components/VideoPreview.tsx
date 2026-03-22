import { useRef, useState, useEffect } from 'react';
import { useSignal, initData } from '@tma.js/sdk-react';
import api from '@/lib/api';
import type { PostDraft } from '@/types/editor';

interface VideoPreviewProps {
  draft: PostDraft;
  onBack: () => void;
  onPublished: () => void;
  onUpdateDraft: (updates: Partial<PostDraft>) => void;
}

type Step = 'preview' | 'publishing' | 'done' | 'error';

export function VideoPreview({ draft, onBack, onPublished, onUpdateDraft }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [step, setStep] = useState<Step>('preview');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const user = useSignal(initData.user);

  // Sync audio <-> video
  useEffect(() => {
    const vid = videoRef.current;
    const aud = audioRef.current;
    if (!vid) return;

    const onTimeUpdate = () => {
      if (vid.currentTime >= draft.trimEnd) {
        vid.currentTime = draft.trimStart;
        if (aud && draft.selectedTrack) {
          aud.currentTime = 0;
          aud.play().catch(() => {});
        }
      }
    };
    const onPlay = () => aud && draft.selectedTrack && aud.play().catch(() => {});
    const onPause = () => aud?.pause();

    vid.addEventListener('timeupdate', onTimeUpdate);
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    return () => {
      vid.removeEventListener('timeupdate', onTimeUpdate);
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
    };
  }, [draft.trimStart, draft.trimEnd, draft.selectedTrack]);

  useEffect(() => {
    const vid = videoRef.current;
    const aud = audioRef.current;
    if (!vid) return;

    vid.currentTime = draft.trimStart;
    vid.volume = draft.selectedTrack ? 1 - draft.musicVolume : 1;
    vid.play().catch(() => {});

    if (aud && draft.selectedTrack) {
      aud.volume = draft.musicVolume;
      aud.currentTime = 0;
      aud.play().catch(() => {});
    }

    return () => { aud?.pause(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.selectedTrack?.id]);

  useEffect(() => {
    const vid = videoRef.current;
    const aud = audioRef.current;
    if (vid) vid.volume = draft.selectedTrack ? 1 - draft.musicVolume : 1;
    if (aud) aud.volume = draft.musicVolume;
  }, [draft.musicVolume, draft.selectedTrack]);

  async function handlePublish() {
    setStep('publishing');
    setProgress(0);

    try {
      // 1. Get presigned URLs
      const presignRes = await api.post<{
        videoUploadUrl: string; videoKey: string;
        thumbUploadUrl: string; thumbKey: string;
      }>('/api/upload/presign', {
        videoFilename: 'video.mp4',
        videoContentType: draft.videoFile.type || 'video/mp4',
        thumbFilename: 'thumb.jpg',
      });

      const { videoUploadUrl, videoKey, thumbUploadUrl, thumbKey } = presignRes.data;

      // 2. Upload video with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', videoUploadUrl);
        xhr.setRequestHeader('Content-Type', draft.videoFile.type || 'video/mp4');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 80));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
        xhr.onerror = () => reject();
        xhr.send(draft.videoFile);
      });

      // 3. Upload thumbnail
      setProgress(85);
      let thumbBlob: Blob;
      try {
        const canvas = document.createElement('canvas');
        const tmpVid = document.createElement('video');
        tmpVid.src = draft.videoUrl;
        tmpVid.muted = true;
        tmpVid.playsInline = true;
        await new Promise<void>(r => { tmpVid.onloadeddata = () => r(); });
        tmpVid.currentTime = 0.1;
        await new Promise<void>(r => { tmpVid.onseeked = () => r(); });
        canvas.width = tmpVid.videoWidth || 360;
        canvas.height = tmpVid.videoHeight || 640;
        canvas.getContext('2d')!.drawImage(tmpVid, 0, 0);
        thumbBlob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.8));
      } catch {
        const canvas = document.createElement('canvas');
        canvas.width = 360; canvas.height = 640;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 360, 640);
        thumbBlob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.8));
      }

      await fetch(thumbUploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: thumbBlob,
      });

      // 4. Create video record
      setProgress(95);
      await api.post('/api/videos', {
        videoKey,
        thumbKey,
        caption: draft.description,
        visibility: draft.isPrivate ? 'subscribers' : 'public',
      });

      setProgress(100);
      setStep('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      setStep('error');
    }
  }

  function stopMedia() {
    videoRef.current?.pause();
    audioRef.current?.pause();
  }

  if (step === 'publishing') {
    return (
      <div className="editor-screen">
        <div className="upload-done">
          <div className="upload-spinner" />
          <p className="upload-done-title">Uploading... {progress}%</p>
          <p className="upload-done-sub">Don't close the app</p>
          <div style={{ width: '80%', height: 4, background: '#2c2c2e', borderRadius: 2, margin: '12px auto' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#fe2c55', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="editor-screen">
        <div className="editor-done-screen">
          <div className="editor-done-check">✓</div>
          <p className="editor-done-title">Video published!</p>
          <p className="editor-done-sub">It's now in the feed.</p>
          <button className="editor-done-btn" onClick={onPublished}>
            Back to feed
          </button>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="editor-screen">
        <div className="upload-done">
          <div className="upload-done-icon">❌</div>
          <p className="upload-done-title">Error</p>
          <p className="upload-done-sub">{errorMsg}</p>
          <button className="upload-share-btn" onClick={() => setStep('preview')}>Retry</button>
          <button className="upload-close-btn" onClick={() => { stopMedia(); onBack(); }}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-screen">
      <div className="editor-header">
        <button className="editor-back-btn" onClick={() => { stopMedia(); onBack(); }}>← Back</button>
        <span className="editor-title">Preview</span>
        <div style={{ width: 80 }} />
      </div>

      <div className="editor-video-wrap">
        <video ref={videoRef} src={draft.videoUrl} className="editor-video" playsInline muted={false} />
        {draft.selectedTrack && <audio ref={audioRef} src={draft.selectedTrack.url} />}
        {draft.selectedTrack && (
          <div className="preview-music-badge">🎵 {draft.selectedTrack.title}</div>
        )}
      </div>

      <div className="preview-panel">
        {draft.selectedTrack && (
          <div className="preview-volume-row">
            <span className="preview-vol-icon">🎤</span>
            <input type="range" className="preview-volume-slider"
              min={0} max={1} step={0.01} value={draft.musicVolume}
              onChange={(e) => onUpdateDraft({ musicVolume: Number(e.target.value) })} />
            <span className="preview-vol-icon">🎵</span>
          </div>
        )}

        <textarea
          className="upload-caption-input"
          placeholder="Add a description... #hashtag"
          value={draft.description}
          onChange={(e) => onUpdateDraft({ description: e.target.value })}
          maxLength={150}
          rows={2}
        />
        <span className="upload-caption-count">{draft.description.length}/150</span>

        <button className="upload-publish-btn" onClick={handlePublish}>
          {draft.isPrivate ? '🔒 Publish for community' : '🌍 Publish for everyone'}
        </button>
      </div>
    </div>
  );
}
