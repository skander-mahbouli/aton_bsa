import { FastifyInstance } from 'fastify';
import { validateInitData } from '../auth/validateInitData.js';
import { getDb } from '../db/schema.js';

export async function authRoutes(app: FastifyInstance) {
    app.post<{ Body: { initData: string } }>('/api/auth/telegram', async (request, reply) => {
        const { initData } = request.body || {};
        if (!initData) {
            return reply.status(400).send({ error: 'initData is required' });
        }

        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
            return reply.status(500).send({ error: 'Bot token not configured' });
        }

        const result = validateInitData(initData, botToken);
        if (!result) {
            return reply.status(401).send({ error: 'Invalid initData' });
        }

        const { user: tgUser } = result;
        const db = getDb();

        // Upsert user
        const stmt = db.prepare(`
            INSERT INTO users (telegram_id, name, username, photo_url)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET
                name = excluded.name,
                username = excluded.username,
                photo_url = excluded.photo_url
        `);

        const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
        stmt.run(
            String(tgUser.id),
            name,
            tgUser.username || null,
            tgUser.photo_url || null,
        );

        // Get user record
        const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(String(tgUser.id)) as Record<string, unknown>;

        // Sign JWT (7 day expiry)
        const token = app.jwt.sign(
            { userId: user.id as number, telegramId: String(tgUser.id) },
            { expiresIn: '7d' },
        );

        return { token, user };
    });
}
