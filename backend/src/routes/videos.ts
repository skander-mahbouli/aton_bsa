import { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../auth/middleware.js';
import { getDb } from '../db/schema.js';
import { registerContentOnChain } from '../ton/register.js';

function buildPublicUrl(key: string): string {
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (publicUrl) {
        return `${publicUrl}/${key}`;
    }
    // Fallback to S3 endpoint (won't work for public access)
    const endpoint = process.env.S3_ENDPOINT || '';
    const bucket = process.env.S3_BUCKET || '';
    return `${endpoint}/${bucket}/${key}`;
}

export async function videoRoutes(app: FastifyInstance) {
    // Create video
    app.post<{
        Body: {
            videoKey: string;
            thumbKey: string;
            caption?: string;
            visibility?: string;
            starPrice?: number;
            requiredToken?: string;
            registerOnTon?: boolean;
            allowComments?: boolean;
        };
    }>('/api/videos', { preHandler: requireAuth }, async (request, reply) => {
        const { videoKey, thumbKey, caption, visibility, starPrice, requiredToken, registerOnTon, allowComments } = request.body || {};

        if (!videoKey || !thumbKey) {
            return reply.status(400).send({ error: 'videoKey and thumbKey are required' });
        }

        const db = getDb();
        const videoUrl = buildPublicUrl(videoKey);
        const thumbnailUrl = buildPublicUrl(thumbKey);

        // Extract hashtags
        const hashtagMatches = (caption || '').match(/#(\w+)/g) || [];
        const hashtags = hashtagMatches.map(h => h.slice(1));

        const stmt = db.prepare(`
            INSERT INTO videos (creator_id, video_url, thumbnail_url, caption, hashtags, visibility, star_price, required_token, allow_comments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            request.user.userId,
            videoUrl,
            thumbnailUrl,
            caption || '',
            JSON.stringify(hashtags),
            visibility || 'public',
            starPrice || null,
            requiredToken || null,
            allowComments !== false ? 1 : 0,
        );

        const videoId = result.lastInsertRowid as number;

        // Insert hashtags
        if (hashtags.length > 0) {
            const hashtagStmt = db.prepare('INSERT INTO video_hashtags (video_id, hashtag) VALUES (?, ?)');
            for (const tag of hashtags) {
                hashtagStmt.run(videoId, tag);
            }
        }

        // Register on TON asynchronously
        if (registerOnTon) {
            const contentHash = `sha256:${videoKey}`;
            registerContentOnChain(videoId, contentHash, db).catch(() => {});
        }

        const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId);
        return reply.status(201).send(video);
    });

    // Get feed
    app.get<{
        Querystring: { feed?: string; page?: string; limit?: string };
    }>('/api/videos', { preHandler: optionalAuth }, async (request) => {
        const db = getDb();
        const feed = request.query.feed || 'foryou';
        const page = parseInt(request.query.page || '0', 10);
        const limit = Math.min(parseInt(request.query.limit || '20', 10), 50);
        const offset = page * limit;
        const userId = request.user?.userId;

        let sql: string;
        const params: unknown[] = [];

        if (feed === 'following' && userId) {
            sql = `
                SELECT v.*,
                    u.name as creator_name, u.username as creator_username, u.photo_url as creator_photo, u.wallet_address as creator_wallet
                FROM videos v
                JOIN users u ON v.creator_id = u.id
                WHERE v.status = 'active'
                    AND v.creator_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
                ORDER BY v.created_at DESC
                LIMIT ? OFFSET ?
            `;
            params.push(userId, limit, offset);
        } else if (feed === 'trending') {
            sql = `
                SELECT v.*,
                    u.name as creator_name, u.username as creator_username, u.photo_url as creator_photo, u.wallet_address as creator_wallet,
                    (v.like_count * 3 + v.comment_count * 5 + v.share_count * 8 - ((unixepoch() - v.created_at) / 3600.0) * 0.5) AS score
                FROM videos v
                JOIN users u ON v.creator_id = u.id
                WHERE v.status = 'active' AND v.created_at > unixepoch() - 86400
                ORDER BY score DESC
                LIMIT ? OFFSET ?
            `;
            params.push(limit, offset);
        } else {
            // foryou
            sql = `
                SELECT v.*,
                    u.name as creator_name, u.username as creator_username, u.photo_url as creator_photo, u.wallet_address as creator_wallet,
                    (v.like_count * 3 + v.comment_count * 5 + v.share_count * 8 - ((unixepoch() - v.created_at) / 3600.0) * 0.5) AS score
                FROM videos v
                JOIN users u ON v.creator_id = u.id
                WHERE v.status = 'active'
                ORDER BY score DESC
                LIMIT ? OFFSET ?
            `;
            params.push(limit, offset);
        }

        const videos = db.prepare(sql).all(...params) as Record<string, unknown>[];

        // Attach isLiked and isUnlocked for authenticated users
        if (userId) {
            const likeStmt = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND video_id = ?');
            const unlockStmt = db.prepare('SELECT 1 FROM video_unlocks WHERE user_id = ? AND video_id = ?');
            for (const video of videos) {
                video.isLiked = !!likeStmt.get(userId, video.id);
                video.isUnlocked = !!unlockStmt.get(userId, video.id);
            }
        }

        return { videos, page, limit };
    });

    // Get single video
    app.get<{ Params: { id: string } }>('/api/videos/:id', { preHandler: optionalAuth }, async (request, reply) => {
        const db = getDb();
        const videoId = parseInt(request.params.id, 10);

        const video = db.prepare(`
            SELECT v.*,
                u.name as creator_name, u.username as creator_username, u.photo_url as creator_photo, u.wallet_address as creator_wallet
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            WHERE v.id = ? AND v.status = 'active'
        `).get(videoId) as Record<string, unknown> | undefined;

        if (!video) {
            return reply.status(404).send({ error: 'Video not found' });
        }

        const userId = request.user?.userId;
        if (userId) {
            video.isLiked = !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND video_id = ?').get(userId, videoId);
            video.isUnlocked = !!db.prepare('SELECT 1 FROM video_unlocks WHERE user_id = ? AND video_id = ?').get(userId, videoId);
        }

        return video;
    });

    // Increment view count
    app.post<{ Params: { id: string } }>('/api/videos/:id/view', async (request) => {
        const db = getDb();
        const videoId = parseInt(request.params.id, 10);
        db.prepare('UPDATE videos SET view_count = view_count + 1 WHERE id = ?').run(videoId);
        return { ok: true };
    });
}
