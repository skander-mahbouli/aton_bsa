import { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { getDb } from '../db/schema.js';

export async function notificationRoutes(app: FastifyInstance) {
    // Get notifications
    app.get('/api/notifications', { preHandler: requireAuth }, async (request) => {
        const db = getDb();
        const userId = request.user.userId;

        const notifications = db.prepare(`
            SELECT n.*
            FROM notifications n
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT 50
        `).all(userId) as Record<string, unknown>[];

        // Enrich with actor info from data_json
        const userStmt = db.prepare('SELECT id, name, username, photo_url FROM users WHERE id = ?');
        for (const notif of notifications) {
            try {
                const data = JSON.parse(notif.data_json as string);
                if (data.actorId) {
                    notif.actor = userStmt.get(data.actorId);
                }
                notif.data = data;
            } catch {
                notif.data = {};
            }
        }

        const unreadCount = (db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        ).get(userId) as { count: number }).count;

        return { notifications, unreadCount };
    });

    // Mark all as read
    app.patch('/api/notifications/read', { preHandler: requireAuth }, async (request) => {
        const db = getDb();
        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(request.user.userId);
        return { ok: true };
    });
}
