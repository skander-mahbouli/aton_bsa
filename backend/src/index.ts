import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { restoreDbFromR2, backupDbToR2 } from './db/backup.js';
import { initDb } from './db/schema.js';
import { registerJwt } from './auth/middleware.js';
import { authRoutes } from './routes/auth.js';
import { storageRoutes } from './routes/storage.js';
import { videoRoutes } from './routes/videos.js';
import { socialRoutes } from './routes/social.js';
import { createPaymentRoutes } from './routes/payments.js';
import { tonRoutes } from './routes/ton.js';
import { userRoutes } from './routes/users.js';
import { notificationRoutes } from './routes/notifications.js';
import { searchRoutes } from './routes/search.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { createBot } from './bot/index.js';

const DB_PATH = path.join(process.cwd(), 'tikton.sqlite');

async function main() {
    // Restore DB from R2 before initializing
    await restoreDbFromR2(DB_PATH);

    // Initialize database
    initDb(DB_PATH);

    const app = Fastify({ logger: true });

    // CORS
    await app.register(cors, {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    });

    // JWT
    await registerJwt(app);

    // Bot
    const bot = createBot(process.env.BOT_TOKEN!);

    // Bot webhook route (raw body, no auth)
    app.post('/bot-webhook', async (request, reply) => {
        try {
            await bot.handleUpdate(request.body as Parameters<typeof bot.handleUpdate>[0]);
            return reply.status(200).send({ ok: true });
        } catch (err) {
            console.error('Bot webhook error:', err);
            return reply.status(200).send({ ok: true });
        }
    });

    // Health check
    app.get('/health', async () => ({ status: 'ok' }));

    // Routes
    await app.register(authRoutes);
    await app.register(storageRoutes);
    await app.register(videoRoutes);
    await app.register(socialRoutes);
    await app.register(createPaymentRoutes(bot));
    await app.register(tonRoutes);
    await app.register(userRoutes);
    await app.register(notificationRoutes);
    await app.register(searchRoutes);
    await app.register(dashboardRoutes);

    // Start server
    const port = parseInt(process.env.PORT || '3001', 10);
    await app.listen({ port, host: '0.0.0.0' });

    // Set bot webhook after server is listening
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
        try {
            await bot.api.setWebhook(`${backendUrl}/bot-webhook`);
            console.log(`Bot webhook set to ${backendUrl}/bot-webhook`);
        } catch (err) {
            console.error('Failed to set bot webhook:', err);
        }
    }

    // Backup DB to R2 every 2 minutes
    setInterval(() => {
        backupDbToR2(DB_PATH).catch(() => {});
    }, 120_000);
}

main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
