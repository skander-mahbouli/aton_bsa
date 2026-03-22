import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { timeAgo } from '../lib/timeAgo';
import type { Comment } from '../types';

interface Props {
    videoId: number;
    onClose: () => void;
}

export default function CommentSheet({ videoId, onClose }: Props) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [loading, setLoading] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get<{ comments: Comment[] }>(`/api/videos/${videoId}/comments`)
            .then((res) => setComments(res.data.comments))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [videoId]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;

        try {
            const res = await api.post<Comment>(`/api/videos/${videoId}/comments`, {
                text: trimmed,
                parentId: replyTo?.id,
            });

            if (replyTo) {
                setComments((prev) =>
                    prev.map((c) =>
                        c.id === replyTo.id
                            ? { ...c, replies: [...(c.replies || []), res.data] }
                            : c,
                    ),
                );
            } else {
                setComments((prev) => [res.data, ...prev]);
            }

            setText('');
            setReplyTo(null);
        } catch {
            // ignore
        }
    };

    const handleReply = (comment: Comment) => {
        setReplyTo(comment);
        setText(`@${comment.user_username || comment.user_name} `);
        inputRef.current?.focus();
    };

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
                className="fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl flex flex-col"
                style={{ backgroundColor: 'var(--tg-bg)', height: '60%' }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--tg-hint)' }} />
                </div>

                {/* Header */}
                <div className="px-4 pb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--tg-text)' }}>
                        Comments
                    </h3>
                    <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="var(--tg-hint)" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Comments list */}
                <div className="flex-1 overflow-y-auto px-4 pb-2">
                    {loading && (
                        <p className="text-center text-sm py-8" style={{ color: 'var(--tg-hint)' }}>
                            Loading...
                        </p>
                    )}

                    {!loading && comments.length === 0 && (
                        <p className="text-center text-sm py-8" style={{ color: 'var(--tg-hint)' }}>
                            No comments yet. Be the first!
                        </p>
                    )}

                    {comments.map((comment) => (
                        <div key={comment.id} className="mb-4">
                            <CommentItem comment={comment} onReply={() => handleReply(comment)} />
                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                                <div className="ml-10 mt-2 flex flex-col gap-2">
                                    {comment.replies.map((reply) => (
                                        <CommentItem key={reply.id} comment={reply} onReply={() => handleReply(comment)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Reply indicator */}
                {replyTo && (
                    <div className="px-4 py-1 flex items-center gap-2 text-xs"
                        style={{ color: 'var(--tg-hint)', borderTop: '1px solid var(--tg-secondary-bg)' }}>
                        <span>Replying to {replyTo.user_name}</span>
                        <button onClick={() => { setReplyTo(null); setText(''); }}
                            className="bg-transparent border-none cursor-pointer"
                            style={{ color: 'var(--tg-link)' }}>
                            Cancel
                        </button>
                    </div>
                )}

                {/* Input bar */}
                <div className="px-4 py-3 flex items-center gap-2"
                    style={{ borderTop: '1px solid var(--tg-secondary-bg)' }}>
                    <input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Add a comment..."
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        style={{ color: 'var(--tg-text)' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!text.trim()}
                        className="bg-transparent border-none cursor-pointer font-semibold text-sm disabled:opacity-30"
                        style={{ color: 'var(--tg-link)' }}>
                        Post
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: () => void }) {
    return (
        <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--tg-button)' }}>
                {(comment.user_name || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs" style={{ color: 'var(--tg-text)' }}>
                        {comment.user_username || comment.user_name}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--tg-hint)' }}>
                        {timeAgo(comment.created_at)}
                    </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: 'var(--tg-text)' }}>
                    {comment.text}
                </p>
                <button onClick={onReply}
                    className="text-[11px] mt-1 bg-transparent border-none cursor-pointer"
                    style={{ color: 'var(--tg-hint)' }}>
                    Reply
                </button>
            </div>
        </div>
    );
}
