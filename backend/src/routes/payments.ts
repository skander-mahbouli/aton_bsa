import { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import type { Bot } from 'grammy';

export function createPaymentRoutes(bot: Bot) {
    return async function paymentRoutes(app: FastifyInstance) {
        app.post<{
            Body: { type: 'tip' | 'unlock'; videoId: number; creatorId: number; amount: number };
        }>('/api/payments/stars/invoice', { preHandler: requireAuth }, async (request, reply) => {
            const { type, videoId, creatorId, amount } = request.body || {};

            if (!type || !videoId || !creatorId || !amount || amount < 1) {
                return reply.status(400).send({ error: 'type, videoId, creatorId, and amount (>=1) are required' });
            }

            if (type !== 'tip' && type !== 'unlock') {
                return reply.status(400).send({ error: 'type must be "tip" or "unlock"' });
            }

            const title = type === 'tip' ? `Tip ${amount} Stars` : `Unlock Video`;
            const description = type === 'tip'
                ? `Send ${amount} Stars to the creator`
                : `Unlock this video for ${amount} Stars`;

            const payload = JSON.stringify({
                type,
                videoId,
                creatorId,
                userId: request.user.userId,
                amount,
            });

            try {
                const invoiceUrl = await bot.api.createInvoiceLink(
                    title,
                    description,
                    payload,
                    '',    // provider_token must be empty for Stars
                    'XTR', // currency must be XTR for Stars
                    [{ label: title, amount }],
                );

                return { invoiceUrl };
            } catch (err) {
                console.error('Failed to create invoice:', err);
                return reply.status(500).send({ error: 'Failed to create invoice' });
            }
        });
    };
}
