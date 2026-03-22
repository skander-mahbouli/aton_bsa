import { Buffer } from 'buffer';
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Initialize Telegram WebApp (safe for browser dev)
try {
    const WebApp = (await import('@twa-dev/sdk')).default;
    if (WebApp.ready) {
        WebApp.ready();
        WebApp.expand();

        // Map Telegram theme params to CSS variables
        const applyTheme = () => {
            const root = document.documentElement;
            const tp = WebApp.themeParams;
            root.style.setProperty('--tg-bg', tp.bg_color || '#ffffff');
            root.style.setProperty('--tg-text', tp.text_color || '#000000');
            root.style.setProperty('--tg-hint', tp.hint_color || '#999999');
            root.style.setProperty('--tg-link', tp.link_color || '#2481cc');
            root.style.setProperty('--tg-button', tp.button_color || '#3390ec');
            root.style.setProperty('--tg-button-text', tp.button_text_color || '#ffffff');
            root.style.setProperty('--tg-secondary-bg', tp.secondary_bg_color || '#f0f0f0');
        };

        applyTheme();
        WebApp.onEvent('themeChanged', applyTheme);
    }
} catch {
    // Not in Telegram — use CSS defaults
}

createRoot(document.getElementById('root')!).render(<App />);
