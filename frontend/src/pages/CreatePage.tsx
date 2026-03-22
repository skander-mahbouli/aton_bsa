import { useState, useRef, useEffect, useCallback } from 'react';
import PublishForm from '../components/PublishForm';

type Screen = 'camera' | 'publish';

export default function CreatePage() {
    const [screen, setScreen] = useState<Screen>('camera');
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);

    if (screen === 'publish' && videoBlob && thumbnailBlob) {
        return (
            <PublishForm
                videoBlob={videoBlob}
                thumbnailBlob={thumbnailBlob}
                onBack={() => { setScreen('camera'); setVideoBlob(null); setThumbnailBlob(null); }}
            />
        );
    }

    return (
        <CameraScreen
            onVideoReady={(video, thumb) => {
                setVideoBlob(video);
                setThumbnailBlob(thumb);
                setScreen('publish');
            }}
        />
    );
}

function CameraScreen({ onVideoReady }: { onVideoReady: (video: Blob, thumb: Blob) => void }) {
    const previewRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [hasCamera, setHasCamera] = useState(false);
    const [recording, setRecording] = useState(false);
    const [recordTime, setRecordTime] = useState(0);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [reviewBlob, setReviewBlob] = useState<Blob | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const startStream = useCallback(async (facing: 'user' | 'environment') => {
        // Stop existing stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing },
                audio: true,
            });
            streamRef.current = stream;
            if (previewRef.current) {
                previewRef.current.srcObject = stream;
            }
            setHasCamera(true);
        } catch {
            setHasCamera(false);
        }
    }, []);

    useEffect(() => {
        startStream(facingMode);
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const flipCamera = () => {
        const newFacing = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacing);
        startStream(newFacing);
    };

    const startRecording = () => {
        if (!streamRef.current) return;
        chunksRef.current = [];

        const recorder = new MediaRecorder(streamRef.current);
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
            setReviewBlob(blob);
            setRecording(false);
            setRecordTime(0);
            if (timerRef.current) clearInterval(timerRef.current);
        };

        recorder.start();
        recorderRef.current = recorder;
        setRecording(true);
        setRecordTime(0);

        timerRef.current = setInterval(() => {
            setRecordTime((t) => {
                if (t >= 179) {
                    recorderRef.current?.stop();
                    return 0;
                }
                return t + 1;
            });
        }, 1000);
    };

    const stopRecording = () => {
        recorderRef.current?.stop();
    };

    const handleFileInput = async (file: File) => {
        if (file.size > 100 * 1024 * 1024) {
            alert('File too large (max 100MB)');
            return;
        }

        // Check duration
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;

        await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => resolve();
        });

        if (video.duration > 180) {
            alert('Video too long (max 3 minutes)');
            URL.revokeObjectURL(url);
            return;
        }

        setReviewBlob(file);
        URL.revokeObjectURL(url);
    };

    const captureFirstFrame = async (videoEl: HTMLVideoElement): Promise<Blob> => {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        canvas.getContext('2d')!.drawImage(videoEl, 0, 0);
        return new Promise((resolve) =>
            canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8),
        );
    };

    const handleUseVideo = async () => {
        if (!reviewBlob) return;

        // Capture thumbnail
        const url = URL.createObjectURL(reviewBlob);
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.src = url;

        await new Promise<void>((resolve) => {
            video.onloadeddata = () => resolve();
        });
        video.currentTime = 0.1;
        await new Promise<void>((resolve) => {
            video.onseeked = () => resolve();
        });

        const thumb = await captureFirstFrame(video);
        URL.revokeObjectURL(url);

        onVideoReady(reviewBlob, thumb);
    };

    // Review screen
    if (reviewBlob) {
        const previewUrl = URL.createObjectURL(reviewBlob);
        return (
            <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--tg-bg)' }}>
                <video
                    src={previewUrl}
                    className="flex-1 object-cover"
                    autoPlay
                    loop
                    playsInline
                    muted
                />
                <div className="flex gap-4 p-4 justify-center">
                    <button
                        onClick={() => { setReviewBlob(null); URL.revokeObjectURL(previewUrl); }}
                        className="px-6 py-3 rounded-full text-sm font-medium"
                        style={{ backgroundColor: 'var(--tg-secondary-bg)', color: 'var(--tg-text)' }}>
                        Retake
                    </button>
                    <button
                        onClick={handleUseVideo}
                        className="px-6 py-3 rounded-full text-sm font-medium"
                        style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                        Use this
                    </button>
                </div>
            </div>
        );
    }

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="h-full flex flex-col relative" style={{ backgroundColor: '#000' }}>
            {/* Camera preview */}
            {hasCamera && (
                <video
                    ref={previewRef}
                    className="flex-1 object-cover"
                    autoPlay
                    playsInline
                    muted
                />
            )}

            {!hasCamera && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <p className="text-white text-sm">Camera not available</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 rounded-full text-sm font-medium"
                        style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                        Record Video
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileInput(e.target.files[0])}
                    />
                </div>
            )}

            {/* Timer */}
            {recording && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-600 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    {formatTime(recordTime)}
                </div>
            )}

            {/* Flip camera button */}
            {hasCamera && !recording && (
                <button onClick={flipCamera}
                    className="absolute top-4 right-4 z-10 bg-black/40 rounded-full p-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                        <path d="M20 16v4H4v-4" />
                        <path d="M4 8V4h16v4" />
                        <polyline points="7 20 4 16 7 12" />
                        <polyline points="17 4 20 8 17 12" />
                    </svg>
                </button>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-8 z-10">
                {/* Gallery */}
                <button onClick={() => galleryInputRef.current?.click()}
                    className="bg-black/40 rounded-full p-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </button>
                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileInput(e.target.files[0])}
                />

                {/* Record button */}
                {hasCamera && (
                    <button
                        onClick={recording ? stopRecording : startRecording}
                        className="relative w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
                        {recording ? (
                            <div className="w-6 h-6 rounded bg-red-600" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-red-600" />
                        )}
                        {recording && (
                            <div className="absolute inset-[-6px] rounded-full border-4 border-red-600 animate-pulse" />
                        )}
                    </button>
                )}

                {/* Placeholder for symmetry */}
                <div className="w-12 h-12" />
            </div>
        </div>
    );
}
