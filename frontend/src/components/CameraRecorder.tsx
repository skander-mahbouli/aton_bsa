import { useRef, useState, useEffect } from 'react';

interface CameraRecorderProps {
  onRecorded: (file: File, url: string) => void;
  onClose: () => void;
}

const MAX_DURATION_S = 60;

// Best supported mime type for this device
function getBestMime(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function CameraRecorder({ onRecorded, onClose }: CameraRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return () => { stopStream(); clearTimer(); };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch {
      setError("Impossible d'accéder à la caméra. Autorise l'accès dans tes paramètres Telegram.");
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || !ready) return;

    const mime = getBestMime();
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = finalize;
    recorderRef.current = recorder;
    recorder.start(100);

    setRecording(true);
    setDuration(0);

    // Auto-stop at MAX_DURATION_S
    timerRef.current = setInterval(() => {
      setDuration((d) => {
        if (d + 1 >= MAX_DURATION_S) { stopRecording(); }
        return d + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    clearTimer();
    recorderRef.current?.stop();
    setRecording(false);
  }

  function finalize() {
    const mime = getBestMime() || 'video/webm';
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunksRef.current, { type: mime });
    const file = new File([blob], `record_${Date.now()}.${ext}`, { type: mime });
    const url = URL.createObjectURL(blob);
    stopStream();
    onRecorded(file, url);
  }

  function handleClose() {
    stopStream();
    clearTimer();
    onClose();
  }

  return (
    <div className="camera-screen">
      {/* Header */}
      <div className="camera-header">
        <button className="editor-back-btn" onClick={handleClose}>✕ Annuler</button>
        {recording && (
          <span className="camera-rec-badge">
            <span className="camera-rec-dot" />
            {duration}s / {MAX_DURATION_S}s
          </span>
        )}
        <div style={{ width: 80 }} />
      </div>

      {error ? (
        <div className="camera-error">
          <p>{error}</p>
          <button className="video-upload-btn" style={{ marginTop: 24 }} onClick={handleClose}>
            Fermer
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="camera-preview"
            autoPlay
            muted
            playsInline
          />

          <div className="camera-controls">
            {!recording ? (
              <button
                className="camera-record-btn"
                onClick={startRecording}
                disabled={!ready}
                aria-label="Démarrer l'enregistrement"
              >
                <span className="camera-record-inner" />
              </button>
            ) : (
              <button
                className="camera-stop-btn"
                onClick={stopRecording}
                aria-label="Arrêter l'enregistrement"
              >
                <span className="camera-stop-inner" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
