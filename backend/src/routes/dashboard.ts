import { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { getDb } from '../db/schema.js';

export async function dashboardRoutes(app: FastifyInstance) {
    // Get creator dashboard stats
    app.get('/api/dashboard', { preHandler: requireAuth }, async (request, reply) => {
        const db = getDb();
        const userId = request.user.userId;

        const user = db.prepare('SELECT is_creator FROM users WHERE id = ?').get(userId) as { is_creator: number } | undefined;
        if (!user || user.is_creator !== 1) {
            return reply.status(403).send({ error: 'Creator access required' });
        }

        const stats = db.prepare(`
            SELECT
                COALESCE(SUM(view_count), 0) as totalViews,
                COALESCE(SUM(like_count), 0) as totalLikes,
                COALESCE(SUM(comment_count), 0) as totalComments,
                COUNT(*) as videoCount
            FROM videos WHERE creator_id = ? AND status = 'active'
        `).get(userId) as Record<string, number>;

        const followers = (db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(userId) as { count: number }).count;
        const subscribers = (db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE creator_id = ? AND expires_at > unixepoch()').get(userId) as { count: number }).count;

        const starsEarned = (db.prepare('SELECT stars_balance FROM users WHERE id = ?').get(userId) as { stars_balance: number }).stars_balance;

        const tonEarned = db.prepare(`
            SELECT COALESCE(SUM(CAST(ton_amount AS REAL)), 0) as total
            FROM subscriptions WHERE creator_id = ?
        `).get(userId) as { total: number };

        const topVideos = db.prepare(`
            SELECT id, caption, thumbnail_url, view_count, like_count, comment_count, share_count, created_at
            FROM videos WHERE creator_id = ? AND status = 'active'
            ORDER BY view_count DESC LIMIT 5
        `).all(userId);

        return {
            ...stats,
            followers,
            subscribers,
            starsEarned,
            tonEarned: tonEarned.total,
            topVideos,
        };
    });

    // Delete own video
    app.delete<{ Params: { id: string } }>('/api/videos/:id', { preHandler: requireAuth }, async (request, reply) => {
        const db = getDb();
        const videoId = parseInt(request.params.id, 10);
        const userId = request.user.userId;

        const video = db.prepare('SELECT creator_id FROM videos WHERE id = ?').get(videoId) as { creator_id: number } | undefined;
        if (!video || video.creator_id !== userId) {
            return reply.status(403).send({ error: 'Not your video' });
        }

        db.prepare("UPDATE videos SET status = 'deleted' WHERE id = ?").run(videoId);
        return { ok: true };
    });

    // Update own video
    app.patch<{ Params: { id: string }; Body: { caption?: string; visibility?: string } }>(
        '/api/videos/:id',
        { preHandler: requireAuth },
        async (request, reply) => {
            const db = getDb();
            const videoId = parseInt(request.params.id, 10);
            const userId = request.user.userId;

            const video = db.prepare('SELECT creator_id FROM videos WHERE id = ?').get(videoId) as { creator_id: number } | undefined;
            if (!video || video.creator_id !== userId) {
                return reply.status(403).send({ error: 'Not your video' });
            }

            const fields: string[] = [];
            const values: unknown[] = [];

            if (request.body?.caption !== undefined) {
                fields.push('caption = ?');
                values.push(request.body.caption);
            }
            if (request.body?.visibility !== undefined) {
                fields.push('visibility = ?');
                values.push(request.body.visibility);
            }

            if (fields.length > 0) {
                values.push(videoId);
                db.prepare(`UPDATE videos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
            }

            return db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
        },
    );
}
