import { FastifyInstance } from 'fastify';
import { getDb } from '../db/schema.js';

export async function searchRoutes(app: FastifyInstance) {
    app.get<{
        Querystring: { q?: string; page?: string };
    }>('/api/search', async (request) => {
        const db = getDb();
        const query = request.query.q || '';
        const page = parseInt(request.query.page || '0', 10);
        const limit = 20;
        const offset = page * limit;

        if (!query.trim()) {
            return { users: [], videos: [], hashtags: [] };
        }

        const pattern = `%${query}%`;

        const users = db.prepare(`
            SELECT id, name, username, photo_url, is_creator
            FROM users
            WHERE name LIKE ? OR username LIKE ?
            LIMIT ? OFFSET ?
        `).all(pattern, pattern, limit, offset);

        const videos = db.prepare(`
            SELECT v.id, v.caption, v.thumbnail_url, v.view_count, v.like_count,
                u.name as creator_name, u.username as creator_username
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            WHERE v.status = 'active' AND v.caption LIKE ?
            ORDER BY v.created_at DESC
            LIMIT ? OFFSET ?
        `).all(pattern, limit, offset);

        return { users, videos };
    });

    app.get('/api/search/trending-hashtags', async () => {
        const db = getDb();
        const hashtags = db.prepare(`
            SELECT hashtag, COUNT(*) as count
            FROM video_hashtags
            GROUP BY hashtag
            ORDER BY count DESC
            LIMIT 20
        `).all();

        return { hashtags };
    });
}
