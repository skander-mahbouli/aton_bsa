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

    // Health check
    app.get('/health', async () => ({ status: 'ok' }));

    // Routes
    await app.register(authRoutes);

    // Start server
    const port = parseInt(process.env.PORT || '3001', 10);
    await app.listen({ port, host: '0.0.0.0' });

    // Backup DB to R2 every 2 minutes
    setInterval(() => {
        backupDbToR2(DB_PATH).catch(() => {});
    }, 120_000);
}

main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
