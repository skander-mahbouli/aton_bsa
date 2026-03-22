import { useRef, useState } from 'react';
import { CameraRecorder } from './CameraRecorder';

interface VideoUploadProps {
  onNext: (file: File, url: string) => void;
  onClose: () => void;
}

const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_DURATION_S = 60;

function IconCamera() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

function IconGallery() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

export function VideoUpload({ onNext, onClose }: VideoUploadProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  function handleFile(file: File) {
    setError('');

    if (file.size > MAX_SIZE_BYTES) {
      setError('La vidéo dépasse 50 Mo.');
      return;
    }

    // Quick codec check before loading
    const type = file.type || 'video/mp4';
    const testEl = document.createElement('video');
    const support = testEl.canPlayType(type);
    if (support === '' && !type.includes('webm') && !type.includes('mp4') && !type.includes('mov') && !type.includes('ogg')) {
      setError('Format non supporté. Utilise MP4 ou WebM.');
      return;
    }

    setLoading(true);
    const url = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.preload = 'metadata';

    // Timeout fallback — some Android files stall on metadata
    const timeout = setTimeout(() => {
      setLoading(false);
      URL.revokeObjectURL(url);
      setError('Impossible de lire cette vidéo. Essaie un autre fichier MP4.');
    }, 8000);

    vid.onloadedmetadata = () => {
      clearTimeout(timeout);
      setLoading(false);
      if (vid.duration > MAX_DURATION_S) {
        URL.revokeObjectURL(url);
        setError(`La vidéo dépasse ${MAX_DURATION_S} secondes.`);
        return;
      }
      setPreview({ file, url });
    };

    vid.onerror = () => {
      clearTimeout(timeout);
      setLoading(false);
      URL.revokeObjectURL(url);
      setError('Format non supporté. Sur Android, utilise un fichier MP4 (H.264).');
    };

    vid.src = url;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function handleBack() {
    if (preview) { URL.revokeObjectURL(preview.url); setPreview(null); }
  }

  // CameraRecorder finished recording → skip directly to preview
  function handleRecorded(file: File, url: string) {
    setShowCamera(false);
    setPreview({ file, url });
  }

  if (showCamera) {
    return (
      <CameraRecorder
        onRecorded={handleRecorded}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="editor-screen">
      <div className="editor-header">
        <button className="editor-back-btn" onClick={preview ? handleBack : onClose}>
          {preview ? '← Retour' : '✕ Annuler'}
        </button>
        <span className="editor-title">Nouvelle vidéo</span>
        {preview ? (
          <button className="editor-next-btn" onClick={() => onNext(preview.file, preview.url)}>
            Suivant →
          </button>
        ) : (
          <div style={{ width: 80 }} />
        )}
      </div>

      {preview ? (
        <div className="upload-preview-wrap" style={{ flex: 1 }}>
          <video src={preview.url} className="upload-preview-video" autoPlay loop muted playsInline />
        </div>
      ) : (
        <div className="video-upload-body">
          {loading && <div className="upload-spinner" style={{ margin: '0 auto 24px' }} />}
          {error && <p className="editor-error">{error}</p>}

          <div className="video-upload-options">
            {/* Filmer → getUserMedia, pas d'input file */}
            <button className="video-upload-btn" onClick={() => setShowCamera(true)}>
              <span className="video-upload-btn-icon"><IconCamera /></span>
              <span className="video-upload-btn-label">Filmer</span>
            </button>

            {/* Galerie → input file sans capture */}
            <button className="video-upload-btn" onClick={() => importRef.current?.click()}>
              <span className="video-upload-btn-icon"><IconGallery /></span>
              <span className="video-upload-btn-label">Galerie</span>
            </button>
          </div>

          <p className="video-upload-hint">MP4 · MOV · WebM — 60 s max — 50 Mo max</p>
        </div>
      )}

      {/* Gallery input — no capture attribute */}
      <input
        ref={importRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
}
