import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

export function getDb(): Database.Database {
    return db;
}

export function initDb(dbPath?: string): Database.Database {
    const resolvedPath = dbPath || path.join(process.cwd(), 'tikton.sqlite');
    db = new Database(resolvedPath);

    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            username TEXT,
            photo_url TEXT,
            bio TEXT,
            is_creator INTEGER DEFAULT 0,
            wallet_address TEXT,
            stars_balance INTEGER DEFAULT 0,
            dm_price INTEGER,
            jetton_address TEXT,
            jetton_name TEXT,
            jetton_symbol TEXT,
            subscription_tiers TEXT DEFAULT '[]',
            created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creator_id INTEGER NOT NULL REFERENCES users(id),
            video_url TEXT NOT NULL,
            thumbnail_url TEXT,
            caption TEXT,
            hashtags TEXT DEFAULT '[]',
            visibility TEXT DEFAULT 'public',
            star_price INTEGER,
            required_token TEXT,
            content_hash TEXT,
            registration_tx TEXT,
            view_count INTEGER DEFAULT 0,
            like_count INTEGER DEFAULT 0,
            comment_count INTEGER DEFAULT 0,
            share_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            allow_comments INTEGER DEFAULT 1,
            created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS likes (
            user_id INTEGER NOT NULL REFERENCES users(id),
            video_id INTEGER NOT NULL REFERENCES videos(id),
            created_at INTEGER DEFAULT (unixepoch()),
            PRIMARY KEY (user_id, video_id)
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            video_id INTEGER NOT NULL REFERENCES videos(id),
            parent_id INTEGER REFERENCES comments(id),
            text TEXT NOT NULL,
            like_count INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS follows (
            follower_id INTEGER NOT NULL REFERENCES users(id),
            following_id INTEGER NOT NULL REFERENCES users(id),
            created_at INTEGER DEFAULT (unixepoch()),
            PRIMARY KEY (follower_id, following_id)
        );

        CREATE TABLE IF NOT EXISTS video_unlocks (
            user_id INTEGER NOT NULL REFERENCES users(id),
            video_id INTEGER NOT NULL REFERENCES videos(id),
            amount_paid INTEGER NOT NULL,
            created_at INTEGER DEFAULT (unixepoch()),
            PRIMARY KEY (user_id, video_id)
        );

        CREATE TABLE IF NOT EXISTS tips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipper_id INTEGER NOT NULL REFERENCES users(id),
            creator_id INTEGER NOT NULL REFERENCES users(id),
            video_id INTEGER REFERENCES videos(id),
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL,
            tx_hash TEXT,
            created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscriber_id INTEGER NOT NULL REFERENCES users(id),
            creator_id INTEGER NOT NULL REFERENCES users(id),
            tier INTEGER NOT NULL,
            ton_amount TEXT,
            tx_hash TEXT,
            expires_at INTEGER NOT NULL,
            created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            type TEXT NOT NULL,
            data_json TEXT DEFAULT '{}',
            is_read INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
            user_id INTEGER NOT NULL REFERENCES users(id),
            video_id INTEGER NOT NULL REFERENCES videos(id),
            created_at INTEGER DEFAULT (unixepoch()),
            PRIMARY KEY (user_id, video_id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL REFERENCES users(id),
            receiver_id INTEGER NOT NULL REFERENCES users(id),
            text TEXT NOT NULL,
            stars_paid INTEGER,
            created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS nft_collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creator_id INTEGER NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            image_url TEXT,
            contract_address TEXT,
            max_supply INTEGER,
            mint_price_ton TEXT,
            minted_count INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS video_hashtags (
            video_id INTEGER NOT NULL REFERENCES videos(id),
            hashtag TEXT NOT NULL,
            created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator_id);
        CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
        CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_video_hashtags_hashtag ON video_hashtags(hashtag);
        CREATE INDEX IF NOT EXISTS idx_video_hashtags_video ON video_hashtags(video_id);
    `);

    return db;
}
