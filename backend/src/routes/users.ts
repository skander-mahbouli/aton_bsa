import { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../auth/middleware.js';
import { getDb } from '../db/schema.js';

export async function userRoutes(app: FastifyInstance) {
    // Get current user
    app.get('/api/users/me', { preHandler: requireAuth }, async (request) => {
        const db = getDb();
        return db.prepare('SELECT * FROM users WHERE id = ?').get(request.user.userId);
    });

    // Update current user
    app.patch<{
        Body: {
            bio?: string;
            walletAddress?: string;
            dmPrice?: number;
            subscriptionTiers?: string;
            jettonAddress?: string;
            jettonName?: string;
            jettonSymbol?: string;
        };
    }>('/api/users/me', { preHandler: requireAuth }, async (request) => {
        const db = getDb();
        const fields: string[] = [];
        const values: unknown[] = [];

        const allowed: Record<string, string> = {
            bio: 'bio',
            walletAddress: 'wallet_address',
            dmPrice: 'dm_price',
            subscriptionTiers: 'subscription_tiers',
            jettonAddress: 'jetton_address',
            jettonName: 'jetton_name',
            jettonSymbol: 'jetton_symbol',
        };

        for (const [key, column] of Object.entries(allowed)) {
            const val = (request.body as Record<string, unknown>)?.[key];
            if (val !== undefined) {
                fields.push(`${column} = ?`);
                values.push(val);
            }
        }

        if (fields.length > 0) {
            values.push(request.user.userId);
            db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        }

        return db.prepare('SELECT * FROM users WHERE id = ?').get(request.user.userId);
    });

    // Become a creator
    app.post('/api/users/me/creator', { preHandler: requireAuth }, async (request) => {
        const db = getDb();
        db.prepare('UPDATE users SET is_creator = 1 WHERE id = ?').run(request.user.userId);
        return db.prepare('SELECT * FROM users WHERE id = ?').get(request.user.userId);
    });

    // Get public profile
    app.get<{ Params: { id: string } }>('/api/users/:id', { preHandler: optionalAuth }, async (request, reply) => {
        const db = getDb();
        const userId = parseInt(request.params.id, 10);

        const user = db.prepare('SELECT id, telegram_id, name, username, photo_url, bio, is_creator, wallet_address, jetton_address, jetton_name, jetton_symbol, subscription_tiers, created_at FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;

        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        const counts = db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followerCount,
                (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as followingCount,
                (SELECT COUNT(*) FROM videos WHERE creator_id = ? AND status = 'active') as videoCount,
                (SELECT COALESCE(SUM(like_count), 0) FROM videos WHERE creator_id = ? AND status = 'active') as totalLikes
        `).get(userId, userId, userId, userId) as Record<string, number>;

        const result = { ...user, ...counts };

        if (request.user?.userId) {
            result.isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(request.user.userId, userId);
        }

        return result;
    });

    // Get user's videos
    app.get<{ Params: { id: string }; Querystring: { page?: string } }>(
        '/api/users/:id/videos',
        { preHandler: optionalAuth },
        async (request) => {
            const db = getDb();
            const userId = parseInt(request.params.id, 10);
            const page = parseInt(request.query.page || '0', 10);
            const limit = 20;
            const offset = page * limit;

            const videos = db.prepare(`
                SELECT v.*, u.name as creator_name, u.username as creator_username, u.photo_url as creator_photo, u.wallet_address as creator_wallet
                FROM videos v
                JOIN users u ON v.creator_id = u.id
                WHERE v.creator_id = ? AND v.status = 'active'
                ORDER BY v.created_at DESC
                LIMIT ? OFFSET ?
            `).all(userId, limit, offset) as Record<string, unknown>[];

            if (request.user?.userId) {
                const likeStmt = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND video_id = ?');
                const unlockStmt = db.prepare('SELECT 1 FROM video_unlocks WHERE user_id = ? AND video_id = ?');
                for (const video of videos) {
                    video.isLiked = !!likeStmt.get(request.user.userId, video.id);
                    video.isUnlocked = !!unlockStmt.get(request.user.userId, video.id);
                }
            }

            return { videos, page, limit };
        },
    );

    // Get user's liked videos
    app.get('/api/users/me/liked', { preHandler: requireAuth }, async (request) => {
        const db = getDb();
        const videos = db.prepare(`
            SELECT v.*, u.name as creator_name, u.username as creator_username, u.photo_url as creator_photo, u.wallet_address as creator_wallet
            FROM likes l
            JOIN videos v ON l.video_id = v.id
            JOIN users u ON v.creator_id = u.id
            WHERE l.user_id = ? AND v.status = 'active'
            ORDER BY l.created_at DESC
        `).all(request.user.userId);

        return { videos };
    });
}
