interface Props {
    videoBlob: Blob;
    thumbnailBlob: Blob;
    onBack: () => void;
}

export default function PublishForm({ onBack }: Props) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--tg-bg)' }}>
            <p style={{ color: 'var(--tg-text)' }}>Publish form — Module 22</p>
            <button onClick={onBack}
                className="px-6 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--tg-secondary-bg)', color: 'var(--tg-text)' }}>
                Back
            </button>
        </div>
    );
}
