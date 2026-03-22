import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const [processing, setProcessing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const startStream = useCallback(async (facing: 'user' | 'environment') => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
                audio: true,
            });
            streamRef.current = stream;
            setHasCamera(true);
            // Wait for video element to render, then attach stream
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (previewRef.current && streamRef.current) {
                        previewRef.current.srcObject = streamRef.current;
                        previewRef.current.play().catch(() => {});
                    }
                }, 100);
            });
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

        // Try different MIME types for compatibility
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
        else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) mimeType = 'video/webm;codecs=vp8';

        const recorder = new MediaRecorder(streamRef.current, { mimeType });
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            setReviewBlob(blob);
            setRecording(false);
            setRecordTime(0);
            if (timerRef.current) clearInterval(timerRef.current);
        };

        recorder.start(1000); // collect chunks every second
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

    const handleFileInput = (file: File) => {
        if (file.size > 100 * 1024 * 1024) {
            alert('File too large (max 100MB)');
            return;
        }
        setReviewBlob(file);
    };

    const handleUseVideo = async () => {
        if (!reviewBlob || processing) return;
        setProcessing(true);

        try {
            // Create a simple 1x1 black thumbnail as fallback
            let thumb: Blob;

            try {
                // Try to capture first frame
                const url = URL.createObjectURL(reviewBlob);
                const video = document.createElement('video');
                video.preload = 'auto';
                video.muted = true;
                video.playsInline = true;
                video.src = url;

                await Promise.race([
                    new Promise<void>((resolve) => { video.onloadeddata = () => resolve(); }),
                    new Promise<void>((_, reject) => setTimeout(() => reject('timeout'), 3000)),
                ]);

                video.currentTime = 0.1;
                await Promise.race([
                    new Promise<void>((resolve) => { video.onseeked = () => resolve(); }),
                    new Promise<void>((_, reject) => setTimeout(() => reject('timeout'), 3000)),
                ]);

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 360;
                canvas.height = video.videoHeight || 640;
                canvas.getContext('2d')!.drawImage(video, 0, 0);
                thumb = await new Promise<Blob>((resolve) =>
                    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8),
                );
                URL.revokeObjectURL(url);
            } catch {
                // Fallback: create a simple black thumbnail
                const canvas = document.createElement('canvas');
                canvas.width = 360;
                canvas.height = 640;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, 360, 640);
                ctx.fillStyle = '#fff';
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Video', 180, 320);
                thumb = await new Promise<Blob>((resolve) =>
                    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8),
                );
            }

            onVideoReady(reviewBlob, thumb);
        } catch {
            alert('Failed to process video. Try uploading from gallery instead.');
        } finally {
            setProcessing(false);
        }
    };

    // Review screen
    if (reviewBlob) {
        const previewUrl = URL.createObjectURL(reviewBlob);
        return (
            <div className="h-full flex flex-col" style={{ backgroundColor: '#000' }}>
                <video
                    src={previewUrl}
                    className="flex-1 w-full object-cover"
                    autoPlay
                    loop
                    playsInline
                    muted
                    style={{ maxHeight: 'calc(100% - 70px)' }}
                />
                <div className="flex gap-4 p-4 justify-center" style={{ backgroundColor: '#000' }}>
                    <button
                        onClick={() => { setReviewBlob(null); URL.revokeObjectURL(previewUrl); }}
                        className="px-8 py-3 rounded-full text-sm font-medium border-none cursor-pointer"
                        style={{ backgroundColor: '#2c2c2e', color: '#fff' }}>
                        Retake
                    </button>
                    <button
                        onClick={handleUseVideo}
                        disabled={processing}
                        className="px-8 py-3 rounded-full text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #25f4ee, #fe2c55)', color: '#fff' }}>
                        {processing ? 'Processing...' : 'Next'}
                    </button>
                </div>
            </div>
        );
    }

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="h-full flex flex-col relative" style={{ backgroundColor: '#000' }}>
            {/* Back button */}
            <button onClick={() => navigate('/')}
                className="absolute top-3 left-3 z-20 bg-black/40 rounded-full p-2 border-none cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {/* Camera preview */}
            {hasCamera && (
                <video
                    ref={previewRef}
                    className="flex-1 w-full object-cover"
                    autoPlay
                    playsInline
                    muted
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
            )}

            {!hasCamera && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    <p className="text-white/40 text-sm">Camera not available</p>
                </div>
            )}

            {/* Timer */}
            {recording && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-600 text-white text-sm px-4 py-1.5 rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    {formatTime(recordTime)}
                </div>
            )}

            {/* Flip camera */}
            {hasCamera && !recording && (
                <button onClick={flipCamera}
                    className="absolute top-3 right-3 z-20 bg-black/40 rounded-full p-2 border-none cursor-pointer">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                        <path d="M20 16v4H4v-4" />
                        <path d="M4 8V4h16v4" />
                        <polyline points="7 20 4 16 7 12" />
                        <polyline points="17 4 20 8 17 12" />
                    </svg>
                </button>
            )}

            {/* Bottom controls */}
            <div className="p-6 flex items-center justify-center gap-8" style={{ backgroundColor: '#000' }}>
                {/* Gallery */}
                <button onClick={() => galleryInputRef.current?.click()}
                    className="bg-transparent border-none cursor-pointer p-2">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <p className="text-white/50 text-[10px] mt-1">Gallery</p>
                </button>
                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileInput(e.target.files[0])}
                />

                {/* Record button */}
                <button
                    onClick={recording ? stopRecording : (hasCamera ? startRecording : () => galleryInputRef.current?.click())}
                    className="relative w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-transparent cursor-pointer">
                    {recording ? (
                        <div className="w-6 h-6 rounded-sm bg-red-500" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-[#fe2c55]" />
                    )}
                    {recording && (
                        <div className="absolute inset-[-6px] rounded-full border-4 border-red-500 animate-pulse" />
                    )}
                </button>

                {/* Placeholder for symmetry */}
                <div className="w-12" />
            </div>
        </div>
    );
}
