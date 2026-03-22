// Access Telegram WebApp from the injected script (telegram-web-app.js)
// This is more reliable than @twa-dev/sdk which wraps it

interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    initData: string;
    initDataUnsafe: {
        start_param?: string;
        user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
        };
    };
    themeParams: Record<string, string>;
    platform: string;
    openInvoice: (url: string, callback: (status: string) => void) => void;
    openTelegramLink: (url: string) => void;
    onEvent: (event: string, callback: () => void) => void;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

export function getWebApp(): TelegramWebApp | null {
    return window.Telegram?.WebApp || null;
}
