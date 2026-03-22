import { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { getDb } from '../db/schema.js';

export async function bookmarkRoutes(app: FastifyInstance) {
    // Toggle bookmark
    app.post<{ Params: { id: string } }>('/api/videos/:id/bookmark', { preHandler: requireAuth }, async (request) => {
        const db = getDb();
        const videoId = parseInt(request.params.id, 10);
        const userId = request.user.userId;

        const existing = db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND video_id = ?').get(userId, videoId);

        if (existing) {
            db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND video_id = ?').run(userId, videoId);
            return { bookmarked: false };
        } else {
            db.prepare('INSERT INTO bookmarks (user_id, video_id) VALUES (?, ?)').run(userId, videoId);
            return { bookmarked: true };
        }
    });

    // Get bookmarked videos
    app.get('/api/users/me/bookmarks', { preHandler: requireAuth }, async (request) => {
        const db = getDb();
        const videos = db.prepare(`
            SELECT v.*, u.name as creator_name, u.username as creator_username, u.photo_url as creator_photo, u.wallet_address as creator_wallet
            FROM bookmarks b
            JOIN videos v ON b.video_id = v.id
            JOIN users u ON v.creator_id = u.id
            WHERE b.user_id = ? AND v.status = 'active'
            ORDER BY b.created_at DESC
        `).all(request.user.userId);

        return { videos };
    });

    // NFT collections
    app.post<{
        Body: { name: string; imageUrl?: string; contractAddress: string; maxSupply: number; mintPriceTon: string };
    }>('/api/nft-collections', { preHandler: requireAuth }, async (request, reply) => {
        const db = getDb();
        const { name, imageUrl, contractAddress, maxSupply, mintPriceTon } = request.body || {};

        if (!name || !contractAddress) {
            return reply.status(400).send({ error: 'name and contractAddress are required' });
        }

        const result = db.prepare(
            'INSERT INTO nft_collections (creator_id, name, image_url, contract_address, max_supply, mint_price_ton) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(request.user.userId, name, imageUrl || null, contractAddress, maxSupply || 0, mintPriceTon || '0');

        return reply.status(201).send(
            db.prepare('SELECT * FROM nft_collections WHERE id = ?').get(result.lastInsertRowid),
        );
    });

    app.get<{ Params: { id: string } }>('/api/users/:id/nft-collections', async (request) => {
        const db = getDb();
        const userId = parseInt(request.params.id, 10);
        const collections = db.prepare('SELECT * FROM nft_collections WHERE creator_id = ? ORDER BY created_at DESC').all(userId);
        return { collections };
    });
}
