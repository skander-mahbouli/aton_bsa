import { useState, useEffect, useRef } from 'react';
import { useSignal, initData } from '@tma.js/sdk-react';
import api from '@/lib/api';
import type { Comment } from '@/types';

interface CommentsDrawerProps {
  videoId: string;
  creatorTelegramId?: string;
  onClose: () => void;
}

function timeAgo(timestamp: number) {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return 'now';
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function CommentsDrawer({ videoId, onClose }: CommentsDrawerProps) {
  const user = useSignal(initData.user);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.classList.add('comments-open');
    return () => document.body.classList.remove('comments-open');
  }, []);

  useEffect(() => { fetchComments(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchComments() {
    setLoading(true);
    try {
      const backendId = videoId.replace('user_', '');
      const res = await api.get<{ comments: Comment[] }>(`/api/videos/${backendId}/comments`);
      setComments(res.data.comments);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    const trimmed = text.trim();
    if (!trimmed || !user || posting) return;
    setPosting(true);

    try {
      const backendId = videoId.replace('user_', '');
      const res = await api.post<Comment>(`/api/videos/${backendId}/comments`, { text: trimmed });
      setComments(prev => [res.data, ...prev]);
    } catch {
      // ignore
    }

    setPosting(false);
    setText('');
  }

  return (
    <div className="comments-overlay" onClick={onClose}>
      <div className="comments-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="comments-handle-bar" />
        <div className="comments-header">
          <span className="comments-title">
            {loading ? 'Comments' : `${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
          </span>
          <button className="comments-close" onClick={onClose}>✕</button>
        </div>

        <div className="comments-list">
          {loading ? (
            <div className="comments-loading">
              <div className="upload-spinner" />
            </div>
          ) : comments.length === 0 ? (
            <p className="comments-empty">No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="comment-item">
                <img
                  className="comment-avatar"
                  src={c.user_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`}
                  alt={c.user_name}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`;
                  }}
                />
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-author">{c.user_name}</span>
                    <span className="comment-time">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="comment-text">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="comments-input-row">
          <input
            ref={inputRef}
            className="comments-input"
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            onKeyDown={(e) => e.key === 'Enter' && handlePost()}
          />
          <button
            className="comments-send-btn"
            onClick={handlePost}
            disabled={!text.trim() || posting}
          >
            {posting ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
