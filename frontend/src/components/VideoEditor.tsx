import { useRef, useState, useEffect, useCallback } from 'react';

interface VideoEditorProps {
  videoUrl: string;
  onNext: (trimStart: number, trimEnd: number) => void;
  onBack: () => void;
}

const MAX_CLIP = 60;

function fmt(s: number) {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function VideoEditor({ videoUrl, onNext, onBack }: VideoEditorProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragging    = useRef<'start' | 'end' | null>(null);

  const [duration,    setDuration]    = useState(0);
  const [trimStart,   setTrimStart]   = useState(0);
  const [trimEnd,     setTrimEnd]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Minimum clip: 3s or full video if shorter
  const minClip = duration > 0 ? Math.min(3, duration) : 3;

  // Load metadata → set initial range
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onMeta = () => {
      const dur = vid.duration;
      setDuration(dur);
      setTrimStart(0);
      setTrimEnd(Math.min(dur, MAX_CLIP));
    };
    vid.addEventListener('loadedmetadata', onMeta);
    // Already loaded (Safari sometimes fires before listener)
    if (vid.readyState >= 1) onMeta();
    return () => vid.removeEventListener('loadedmetadata', onMeta);
  }, []);

  // Loop within [trimStart, trimEnd]
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => {
      if (vid.currentTime >= trimEnd || vid.currentTime < trimStart) {
        vid.currentTime = trimStart;
      }
      setCurrentTime(vid.currentTime);
    };
    vid.addEventListener('timeupdate', onTime);
    return () => vid.removeEventListener('timeupdate', onTime);
  }, [trimStart, trimEnd]);

  // Seek + play when trimStart changes
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || duration === 0) return;
    vid.currentTime = trimStart;
    vid.play().catch(() => {});
  }, [trimStart, duration]);

  const timeFromPointer = useCallback(
    (clientX: number) => {
      const tl = timelineRef.current;
      if (!tl || duration === 0) return 0;
      const { left, width } = tl.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
      return ratio * duration;
    },
    [duration],
  );

  // Each handle captures its own pointer events — onPointerMove on the handle itself
  function makeHandleHandlers(handle: 'start' | 'end') {
    return {
      onPointerDown(e: React.PointerEvent) {
        e.preventDefault();
        dragging.current = handle;
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove(e: React.PointerEvent) {
        if (dragging.current !== handle) return;
        const t = timeFromPointer(e.clientX);
        if (handle === 'start') {
          const next = Math.max(0, Math.min(t, trimEnd - minClip));
          setTrimStart(next);
          if (videoRef.current) videoRef.current.currentTime = next;
        } else {
          const next = Math.min(duration, Math.max(t, trimStart + minClip));
          setTrimEnd(Math.min(next, trimStart + MAX_CLIP));
        }
      },
      onPointerUp() {
        dragging.current = null;
      },
      onPointerCancel() {
        dragging.current = null;
      },
    };
  }

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct   = duration > 0 ? (trimEnd   / duration) * 100 : 100;
  const headPct  = duration > 0 ? (currentTime / duration) * 100 : 0;
  const clipLen  = trimEnd - trimStart;

  const canProceed = duration > 0 && clipLen >= minClip;

  return (
    <div className="editor-screen">
      {/* Header */}
      <div className="editor-header">
        <button className="editor-back-btn" onClick={onBack}>← Retour</button>
        <span className="editor-title">Couper la vidéo</span>
        <button
          className="editor-next-btn"
          onClick={() => onNext(trimStart, trimEnd)}
          disabled={!canProceed}
        >
          Suivant →
        </button>
      </div>

      {/* Video */}
      <div className="editor-video-wrap">
        <video
          ref={videoRef}
          src={videoUrl}
          className="editor-video"
          autoPlay
          muted
          playsInline
        />
      </div>

      {/* Trim panel */}
      <div className="editor-trim-panel">
        <div className="editor-duration-label">
          {fmt(trimStart)} — {fmt(trimEnd)}&nbsp;
          <span className="editor-duration-len">({Math.round(clipLen)}s)</span>
        </div>

        <div className="editor-timeline" ref={timelineRef}>
          <div className="timeline-track" />

          {/* Selected range */}
          <div
            className="timeline-range"
            style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          />

          {/* Playhead */}
          <div className="timeline-playhead" style={{ left: `${headPct}%` }} />

          {/* Start handle — pointer events live on the handle itself */}
          <div
            className="timeline-handle timeline-handle--start"
            style={{ left: `${startPct}%` }}
            {...makeHandleHandlers('start')}
          >
            <div className="timeline-handle-grip" />
          </div>

          {/* End handle */}
          <div
            className="timeline-handle timeline-handle--end"
            style={{ left: `${endPct}%` }}
            {...makeHandleHandlers('end')}
          >
            <div className="timeline-handle-grip" />
          </div>
        </div>

        <p className="editor-trim-hint">
          Glisse les bords pour définir le début et la fin
        </p>
      </div>
    </div>
  );
}
