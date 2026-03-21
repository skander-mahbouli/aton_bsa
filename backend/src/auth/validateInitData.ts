import crypto from 'crypto';

export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    language_code?: string;
}

export interface InitDataResult {
    user: TelegramUser;
    authDate: number;
    hash: string;
    queryId?: string;
}

export function validateInitData(initData: string, botToken: string): InitDataResult | null {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Remove hash from params and sort alphabetically
    params.delete('hash');
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // HMAC-SHA256("WebAppData", botToken) -> secretKey
    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

    // HMAC-SHA256(secretKey, dataCheckString) -> computed hash
    const computedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    if (computedHash !== hash) return null;

    // Parse user
    const userStr = params.get('user');
    if (!userStr) return null;

    try {
        const user: TelegramUser = JSON.parse(userStr);
        return {
            user,
            authDate: parseInt(params.get('auth_date') || '0', 10),
            hash,
            queryId: params.get('query_id') || undefined,
        };
    } catch {
        return null;
    }
}
