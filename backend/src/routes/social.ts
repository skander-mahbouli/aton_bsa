import { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../auth/middleware.js';
import { getDb } from '../db/schema.js';

export async function socialRoutes(app: FastifyInstance) {
    // Toggle like
    app.post<{ Params: { id: string } }>('/api/videos/:id/like', { preHandler: requireAuth }, async (request) => {
        const db = getDb();
        const videoId = parseInt(request.params.id, 10);
        const userId = request.user.userId;

        const existing = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND video_id = ?').get(userId, videoId);

        if (existing) {
            db.prepare('DELETE FROM likes WHERE user_id = ? AND video_id = ?').run(userId, videoId);
            db.prepare('UPDATE videos SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(videoId);
            const video = db.prepare('SELECT like_count FROM videos WHERE id = ?').get(videoId) as { like_count: number };
            return { liked: false, likeCount: video.like_count };
        } else {
            db.prepare('INSERT INTO likes (user_id, video_id) VALUES (?, ?)').run(userId, videoId);
            db.prepare('UPDATE videos SET like_count = like_count + 1 WHERE id = ?').run(videoId);
            const video = db.prepare('SELECT like_count, creator_id FROM videos WHERE id = ?').get(videoId) as { like_count: number; creator_id: number };

            // Notify creator
            if (video.creator_id !== userId) {
                db.prepare('INSERT INTO notifications (user_id, type, data_json) VALUES (?, ?, ?)').run(
                    video.creator_id,
                    'like',
                    JSON.stringify({ videoId, actorId: userId }),
                );
            }

            return { liked: true, likeCount: video.like_count };
        }
    });

    // Get comments
    app.get<{ Params: { id: string } }>('/api/videos/:id/comments', { preHandler: optionalAuth }, async (request) => {
        const db = getDb();
        const videoId = parseInt(request.params.id, 10);

        const topLevel = db.prepare(`
            SELECT c.*, u.name as user_name, u.username as user_username, u.photo_url as user_photo
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.video_id = ? AND c.parent_id IS NULL
            ORDER BY c.created_at DESC
        `).all(videoId) as Record<string, unknown>[];

        const replyStmt = db.prepare(`
            SELECT c.*, u.name as user_name, u.username as user_username, u.photo_url as user_photo
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.parent_id = ?
            ORDER BY c.created_at ASC
        `);

        for (const comment of topLevel) {
            comment.replies = replyStmt.all(comment.id);
        }

        return { comments: topLevel };
    });

    // Post comment
    app.post<{ Params: { id: string }; Body: { text: string; parentId?: number } }>(
        '/api/videos/:id/comments',
        { preHandler: requireAuth },
        async (request, reply) => {
            const db = getDb();
            const videoId = parseInt(request.params.id, 10);
            const userId = request.user.userId;
            const { text, parentId } = request.body || {};

            if (!text || !text.trim()) {
                return reply.status(400).send({ error: 'text is required' });
            }

            const result = db.prepare(
                'INSERT INTO comments (user_id, video_id, parent_id, text) VALUES (?, ?, ?, ?)',
            ).run(userId, videoId, parentId || null, text.trim());

            db.prepare('UPDATE videos SET comment_count = comment_count + 1 WHERE id = ?').run(videoId);

            const comment = db.prepare(`
                SELECT c.*, u.name as user_name, u.username as user_username, u.photo_url as user_photo
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.id = ?
            `).get(result.lastInsertRowid) as Record<string, unknown>;

            // Notify video creator
            const video = db.prepare('SELECT creator_id FROM videos WHERE id = ?').get(videoId) as { creator_id: number };
            if (video.creator_id !== userId) {
                db.prepare('INSERT INTO notifications (user_id, type, data_json) VALUES (?, ?, ?)').run(
                    video.creator_id,
                    'comment',
                    JSON.stringify({ videoId, commentId: comment.id, actorId: userId }),
                );
            }

            // Notify parent comment author if reply
            if (parentId) {
                const parent = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(parentId) as { user_id: number } | undefined;
                if (parent && parent.user_id !== userId) {
                    db.prepare('INSERT INTO notifications (user_id, type, data_json) VALUES (?, ?, ?)').run(
                        parent.user_id,
                        'reply',
                        JSON.stringify({ videoId, commentId: comment.id, actorId: userId }),
                    );
                }
            }

            return reply.status(201).send(comment);
        },
    );

    // Toggle follow
    app.post<{ Params: { id: string } }>('/api/users/:id/follow', { preHandler: requireAuth }, async (request, reply) => {
        const db = getDb();
        const followingId = parseInt(request.params.id, 10);
        const followerId = request.user.userId;

        if (followerId === followingId) {
            return reply.status(400).send({ error: 'Cannot follow yourself' });
        }

        const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(followerId, followingId);

        if (existing) {
            db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(followerId, followingId);
            return { following: false };
        } else {
            db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(followerId, followingId);

            db.prepare('INSERT INTO notifications (user_id, type, data_json) VALUES (?, ?, ?)').run(
                followingId,
                'follow',
                JSON.stringify({ actorId: followerId }),
            );

            return { following: true };
        }
    });

    // Share (increment count)
    app.post<{ Params: { id: string } }>('/api/videos/:id/share', async (request) => {
        const db = getDb();
        const videoId = parseInt(request.params.id, 10);
        db.prepare('UPDATE videos SET share_count = share_count + 1 WHERE id = ?').run(videoId);
        const video = db.prepare('SELECT share_count FROM videos WHERE id = ?').get(videoId) as { share_count: number };
        return { shareCount: video.share_count };
    });
}
