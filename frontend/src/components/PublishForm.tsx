import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface Props {
    videoBlob: Blob;
    thumbnailBlob: Blob;
    onBack: () => void;
}

type Visibility = 'public' | 'subscribers' | 'token_gated' | 'paid';

export default function PublishForm({ videoBlob, thumbnailBlob, onBack }: Props) {
    const navigate = useNavigate();
    const [caption, setCaption] = useState('');
    const [visibility, setVisibility] = useState<Visibility>('public');
    const [starPrice, setStarPrice] = useState('');
    const [tokenAddress, setTokenAddress] = useState('');
    const [tokenMinBalance, setTokenMinBalance] = useState('');
    const [registerOnTon, setRegisterOnTon] = useState(true);
    const [allowComments, setAllowComments] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handlePost = async () => {
        if (uploading) return;
        setUploading(true);
        setProgress(0);

        try {
            // 1. Get presigned URLs
            const presignRes = await api.post<{
                videoUploadUrl: string;
                videoKey: string;
                thumbUploadUrl: string;
                thumbKey: string;
            }>('/api/upload/presign', {
                videoFilename: 'video.mp4',
                videoContentType: 'video/mp4',
                thumbFilename: 'thumb.jpg',
            });

            const { videoUploadUrl, videoKey, thumbUploadUrl, thumbKey } = presignRes.data;

            // 2. Upload video with progress via XMLHttpRequest
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', videoUploadUrl);
                xhr.setRequestHeader('Content-Type', 'video/mp4');
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setProgress(Math.round((e.loaded / e.total) * 90));
                    }
                };
                xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
                xhr.onerror = () => reject();
                xhr.send(videoBlob);
            });

            // 3. Upload thumbnail
            setProgress(92);
            await fetch(thumbUploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'image/jpeg' },
                body: thumbnailBlob,
            });

            // 4. Create video record
            setProgress(95);
            let requiredToken: string | undefined;
            if (visibility === 'token_gated' && tokenAddress) {
                requiredToken = JSON.stringify({
                    address: tokenAddress,
                    symbol: 'TOKEN',
                    minBalance: tokenMinBalance || '1',
                });
            }

            await api.post('/api/videos', {
                videoKey,
                thumbKey,
                caption,
                visibility,
                starPrice: visibility === 'paid' ? parseInt(starPrice) || 10 : undefined,
                requiredToken,
                registerOnTon,
                allowComments,
            });

            setProgress(100);
            navigate('/');
        } catch {
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const renderCaption = () => {
        return caption.split(/(#\w+)/g).map((part, i) =>
            part.startsWith('#')
                ? <span key={i} style={{ color: 'var(--tg-link)' }}>{part}</span>
                : <span key={i}>{part}</span>
        );
    };

    return (
        <div className="h-full overflow-y-auto" style={{ backgroundColor: 'var(--tg-bg)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <button onClick={onBack} className="bg-transparent border-none cursor-pointer"
                    style={{ color: 'var(--tg-text)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h2 className="font-semibold text-base" style={{ color: 'var(--tg-text)' }}>New Post</h2>
                <div className="w-6" />
            </div>

            {/* Upload progress */}
            {uploading && (
                <div className="px-4 mb-4">
                    <div className="w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                        <div className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress}%`, backgroundColor: 'var(--tg-button)' }} />
                    </div>
                    <p className="text-xs mt-1 text-center" style={{ color: 'var(--tg-hint)' }}>
                        {progress < 90 ? 'Uploading video...' : progress < 95 ? 'Uploading thumbnail...' : progress < 100 ? 'Creating post...' : 'Done!'}
                    </p>
                </div>
            )}

            {/* Caption */}
            <div className="px-4 mb-4">
                <div className="relative">
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value.slice(0, 500))}
                        placeholder="Write a caption... #hashtags"
                        rows={4}
                        className="w-full p-3 rounded-xl text-sm bg-transparent outline-none resize-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                    />
                    <span className="absolute bottom-2 right-3 text-[10px]"
                        style={{ color: 'var(--tg-hint)' }}>
                        {caption.length}/500
                    </span>
                </div>
                {caption && (
                    <div className="mt-1 text-sm px-1">{renderCaption()}</div>
                )}
            </div>

            {/* Visibility */}
            <div className="px-4 mb-4">
                <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--tg-hint)' }}>Visibility</label>
                <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--tg-secondary-bg)' }}>
                    {(['public', 'subscribers', 'token_gated', 'paid'] as Visibility[]).map((v) => (
                        <button key={v}
                            onClick={() => setVisibility(v)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={visibility === v
                                ? { backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }
                                : { backgroundColor: 'transparent', color: 'var(--tg-text)' }
                            }>
                            {v === 'public' ? 'Public' : v === 'subscribers' ? 'Subs' : v === 'token_gated' ? 'Token' : 'Paid'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Token-gated options */}
            {visibility === 'token_gated' && (
                <div className="px-4 mb-4 flex flex-col gap-2">
                    <input
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                        placeholder="Jetton minter address"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                    />
                    <input
                        value={tokenMinBalance}
                        onChange={(e) => setTokenMinBalance(e.target.value)}
                        placeholder="Min balance required"
                        type="number"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                    />
                </div>
            )}

            {/* Paid options */}
            {visibility === 'paid' && (
                <div className="px-4 mb-4">
                    <input
                        value={starPrice}
                        onChange={(e) => setStarPrice(e.target.value)}
                        placeholder="Stars price"
                        type="number"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--tg-secondary-bg)', color: 'var(--tg-text)' }}
                    />
                </div>
            )}

            {/* Toggles */}
            <div className="px-4 mb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--tg-text)' }}>Register on TON</span>
                    <button onClick={() => setRegisterOnTon(!registerOnTon)}
                        className="w-11 h-6 rounded-full transition-colors relative"
                        style={{ backgroundColor: registerOnTon ? 'var(--tg-button)' : 'var(--tg-secondary-bg)' }}>
                        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                            style={{ transform: registerOnTon ? 'translateX(22px)' : 'translateX(2px)' }} />
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--tg-text)' }}>Allow comments</span>
                    <button onClick={() => setAllowComments(!allowComments)}
                        className="w-11 h-6 rounded-full transition-colors relative"
                        style={{ backgroundColor: allowComments ? 'var(--tg-button)' : 'var(--tg-secondary-bg)' }}>
                        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                            style={{ transform: allowComments ? 'translateX(22px)' : 'translateX(2px)' }} />
                    </button>
                </div>
            </div>

            {/* Post button */}
            <div className="px-4 pb-20">
                <button
                    onClick={handlePost}
                    disabled={uploading}
                    className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
                    style={{ backgroundColor: 'var(--tg-button)', color: 'var(--tg-button-text)' }}>
                    {uploading ? 'Posting...' : 'Post'}
                </button>
            </div>
        </div>
    );
}
