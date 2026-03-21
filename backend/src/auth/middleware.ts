import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        user: { userId: number; telegramId: string };
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { userId: number; telegramId: string };
        user: { userId: number; telegramId: string };
    }
}

export async function registerJwt(app: FastifyInstance) {
    await app.register(jwt, {
        secret: process.env.JWT_SECRET!,
    });
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify();
    } catch {
        reply.status(401).send({ error: 'Unauthorized' });
    }
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
    try {
        await request.jwtVerify();
    } catch {
        // Not authenticated — that's fine for optional auth
        (request as FastifyRequest).user = undefined as unknown as FastifyRequest['user'];
    }
}
