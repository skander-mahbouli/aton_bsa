import { FastifyInstance } from 'fastify';
import { Address, TupleBuilder } from '@ton/ton';
import { requireAuth } from '../auth/middleware.js';
import { getDb } from '../db/schema.js';
import { checkJettonBalance } from '../ton/checkBalance.js';
import { getTonClient } from '../ton/client.js';

export async function tonRoutes(app: FastifyInstance) {
    // Check if wallet has enough tokens for gated content
    app.get<{
        Querystring: { walletAddress: string; jettonAddress: string; minBalance: string };
    }>('/api/ton/check-token-access', { preHandler: requireAuth }, async (request, reply) => {
        const { walletAddress, jettonAddress, minBalance } = request.query;

        if (!walletAddress || !jettonAddress || !minBalance) {
            return reply.status(400).send({ error: 'walletAddress, jettonAddress, and minBalance are required' });
        }

        try {
            const balance = await checkJettonBalance(walletAddress, jettonAddress);
            const required = BigInt(minBalance);
            return { hasAccess: balance >= required, balance: balance.toString() };
        } catch {
            return { hasAccess: false, balance: '0' };
        }
    });

    // Check subscription status
    app.get<{
        Querystring: { subscriberWallet?: string; creatorId: string };
    }>('/api/subscriptions/check', { preHandler: requireAuth }, async (request, reply) => {
        const { subscriberWallet, creatorId } = request.query;

        if (!creatorId) {
            return reply.status(400).send({ error: 'creatorId is required' });
        }

        const db = getDb();
        const creator = db.prepare('SELECT wallet_address FROM users WHERE id = ?').get(parseInt(creatorId, 10)) as { wallet_address: string | null } | undefined;

        if (!creator) {
            return reply.status(404).send({ error: 'Creator not found' });
        }

        // Try on-chain check first if both wallets are available
        if (subscriberWallet && creator.wallet_address) {
            try {
                const subManagerAddress = process.env.SUBSCRIPTION_MANAGER_ADDRESS;
                if (subManagerAddress) {
                    const client = getTonClient();
                    const args = new TupleBuilder();
                    args.writeAddress(Address.parse(subscriberWallet));
                    args.writeAddress(Address.parse(creator.wallet_address));
                    const result = await client.runMethod(
                        Address.parse(subManagerAddress),
                        'isSubscribed',
                        args.build(),
                    );
                    const isSubscribed = result.stack.readBoolean();
                    if (isSubscribed) {
                        return { isSubscribed: true, expiresAt: null, source: 'onchain' };
                    }
                }
            } catch {
                // Fall through to DB check
            }
        }

        // Fallback: check DB
        const sub = db.prepare(
            'SELECT expires_at FROM subscriptions WHERE subscriber_id = ? AND creator_id = ? AND expires_at > unixepoch() ORDER BY expires_at DESC LIMIT 1',
        ).get(request.user.userId, parseInt(creatorId, 10)) as { expires_at: number } | undefined;

        if (sub) {
            return { isSubscribed: true, expiresAt: sub.expires_at, source: 'db' };
        }

        return { isSubscribed: false, expiresAt: null };
    });

    // Record a subscription after TonConnect tx
    app.post<{
        Body: { creatorId: number; tier: number; txHash: string; tonAmount: string };
    }>('/api/subscriptions/record', { preHandler: requireAuth }, async (request, reply) => {
        const { creatorId, tier, txHash, tonAmount } = request.body || {};

        if (!creatorId || !tier || !txHash) {
            return reply.status(400).send({ error: 'creatorId, tier, and txHash are required' });
        }

        const db = getDb();
        const expiresAt = Math.floor(Date.now() / 1000) + 2592000; // 30 days

        const result = db.prepare(
            'INSERT INTO subscriptions (subscriber_id, creator_id, tier, ton_amount, tx_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(request.user.userId, creatorId, tier, tonAmount || null, txHash, expiresAt);

        // Notify creator
        db.prepare('INSERT INTO notifications (user_id, type, data_json) VALUES (?, ?, ?)').run(
            creatorId,
            'subscription',
            JSON.stringify({ tier, actorId: request.user.userId }),
        );

        const subscription = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(result.lastInsertRowid);
        return reply.status(201).send(subscription);
    });
}
