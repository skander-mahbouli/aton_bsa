export interface User {
    id: number;
    telegram_id: string;
    name: string;
    username: string | null;
    photo_url: string | null;
    bio: string | null;
    is_creator: number;
    wallet_address: string | null;
    stars_balance: number;
    dm_price: number | null;
    jetton_address: string | null;
    jetton_name: string | null;
    jetton_symbol: string | null;
    subscription_tiers: string;
    created_at: number;
}

export interface Video {
    id: number;
    creator_id: number;
    video_url: string;
    thumbnail_url: string | null;
    caption: string;
    hashtags: string;
    visibility: string;
    star_price: number | null;
    required_token: string | null;
    content_hash: string | null;
    registration_tx: string | null;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    status: string;
    allow_comments: number;
    created_at: number;
    creator_name?: string;
    creator_username?: string;
    creator_photo?: string;
    creator_wallet?: string;
    isLiked?: boolean;
    isUnlocked?: boolean;
}

export interface Comment {
    id: number;
    user_id: number;
    video_id: number;
    parent_id: number | null;
    text: string;
    like_count: number;
    created_at: number;
    user_name: string;
    user_username: string | null;
    user_photo: string | null;
    replies?: Comment[];
}

export interface Notification {
    id: number;
    user_id: number;
    type: string;
    data_json: string;
    data: Record<string, unknown>;
    is_read: number;
    created_at: number;
    actor?: Pick<User, 'id' | 'name' | 'username' | 'photo_url'>;
}

export interface Subscription {
    id: number;
    subscriber_id: number;
    creator_id: number;
    tier: number;
    ton_amount: string | null;
    tx_hash: string | null;
    expires_at: number;
    created_at: number;
}
