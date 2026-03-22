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
            <motion.div className="fixed inset-0 bg-black/60 z-40"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} />

            <motion.div
                className="fixed left-0 right-0 z-[60] rounded-t-2xl flex flex-col"
                style={{ backgroundColor: '#1c1c1e', bottom: '56px', height: '55%' }}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-9 h-1 rounded-full bg-white/20" />
                </div>

                <div className="px-4 pb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-white">
                        Comments
                    </h3>
                    <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-2 hide-scrollbar">
                    {loading && <p className="text-center text-sm py-8 text-white/30">Loading...</p>}
                    {!loading && comments.length === 0 && (
                        <p className="text-center text-sm py-8 text-white/30">No comments yet</p>
                    )}

                    {comments.map((comment) => (
                        <div key={comment.id} className="mb-4">
                            <CommentItem comment={comment} onReply={() => handleReply(comment)} />
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

                {replyTo && (
                    <div className="px-4 py-1.5 flex items-center gap-2 text-xs"
                        style={{ borderTop: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                        <span>Replying to {replyTo.user_name}</span>
                        <button onClick={() => { setReplyTo(null); setText(''); }}
                            className="bg-transparent border-none cursor-pointer text-[#0a84ff] text-xs">
                            Cancel
                        </button>
                    </div>
                )}

                <div className="px-4 py-3 flex items-center gap-2"
                    style={{ borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
                    <input ref={inputRef} value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Add a comment..."
                        className="flex-1 px-4 py-2.5 rounded-full text-sm bg-transparent outline-none border-none"
                        style={{ backgroundColor: '#2c2c2e', color: '#fff' }} />
                    <button onClick={handleSend} disabled={!text.trim()}
                        className="bg-transparent border-none cursor-pointer font-semibold text-sm disabled:opacity-30"
                        style={{ color: '#fe2c55' }}>
                        Post
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: () => void }) {
    return (
        <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: '#fe2c55', color: '#fff' }}>
                {(comment.user_name || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-white/70">
                        {comment.user_username || comment.user_name}
                    </span>
                    <span className="text-[10px] text-white/30">
                        {timeAgo(comment.created_at)}
                    </span>
                </div>
                <p className="text-sm mt-0.5 text-white/90">{comment.text}</p>
                <button onClick={onReply}
                    className="text-[11px] mt-1 bg-transparent border-none cursor-pointer text-white/40">
                    Reply
                </button>
            </div>
        </div>
    );
}
