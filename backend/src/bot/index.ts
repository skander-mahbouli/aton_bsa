import { Bot, Context } from 'grammy';
import { getDb } from '../db/schema.js';

export function createBot(token: string): Bot {
    const bot = new Bot(token);

    bot.command('start', async (ctx) => {
        const miniAppUrl = process.env.MINI_APP_URL;
        if (miniAppUrl) {
            await ctx.reply('Welcome to TikTon! Tap below to open the app.', {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Open TikTon', web_app: { url: miniAppUrl } }]],
                },
            });
        } else {
            await ctx.reply('Welcome to TikTon!');
        }
    });

    bot.on('pre_checkout_query', async (ctx) => {
        await ctx.answerPreCheckoutQuery(true);
    });

    bot.on('message:successful_payment', async (ctx) => {
        await handleSuccessfulPayment(ctx);
    });

    return bot;
}

interface InvoicePayload {
    type: 'tip' | 'unlock';
    videoId: number;
    creatorId: number;
    userId: number;
    amount: number;
}

async function handleSuccessfulPayment(ctx: Context): Promise<void> {
    const payment = ctx.message?.successful_payment;
    if (!payment) return;

    let payload: InvoicePayload;
    try {
        payload = JSON.parse(payment.invoice_payload);
    } catch {
        return;
    }

    const db = getDb();

    if (payload.type === 'tip') {
        // Insert tip record
        db.prepare(
            'INSERT INTO tips (tipper_id, creator_id, video_id, amount, currency) VALUES (?, ?, ?, ?, ?)',
        ).run(payload.userId, payload.creatorId, payload.videoId, payload.amount, 'stars');

        // 95% to creator
        const creatorAmount = Math.floor(payload.amount * 0.95);
        db.prepare('UPDATE users SET stars_balance = stars_balance + ? WHERE id = ?').run(creatorAmount, payload.creatorId);

        // Notify creator
        db.prepare('INSERT INTO notifications (user_id, type, data_json) VALUES (?, ?, ?)').run(
            payload.creatorId,
            'tip',
            JSON.stringify({ videoId: payload.videoId, amount: payload.amount, actorId: payload.userId }),
        );
    } else if (payload.type === 'unlock') {
        // Insert unlock record
        db.prepare(
            'INSERT OR IGNORE INTO video_unlocks (user_id, video_id, amount_paid) VALUES (?, ?, ?)',
        ).run(payload.userId, payload.videoId, payload.amount);

        // 92% to creator
        const creatorAmount = Math.floor(payload.amount * 0.92);
        db.prepare('UPDATE users SET stars_balance = stars_balance + ? WHERE id = ?').run(creatorAmount, payload.creatorId);

        // Notify creator
        db.prepare('INSERT INTO notifications (user_id, type, data_json) VALUES (?, ?, ?)').run(
            payload.creatorId,
            'unlock',
            JSON.stringify({ videoId: payload.videoId, amount: payload.amount, actorId: payload.userId }),
        );
    }
}
