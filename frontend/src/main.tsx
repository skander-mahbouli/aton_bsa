import './polyfills';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { getWebApp } from './lib/telegram';

// Initialize Telegram WebApp
const webApp = getWebApp();
if (webApp) {
    webApp.ready();
    webApp.expand();

    const applyTheme = () => {
        const root = document.documentElement;
        const tp = webApp.themeParams;
        root.style.setProperty('--tg-bg', tp.bg_color || '#000000');
        root.style.setProperty('--tg-text', tp.text_color || '#ffffff');
        root.style.setProperty('--tg-hint', tp.hint_color || '#8e8e93');
        root.style.setProperty('--tg-link', tp.link_color || '#0a84ff');
        root.style.setProperty('--tg-button', tp.button_color || '#0a84ff');
        root.style.setProperty('--tg-button-text', tp.button_text_color || '#ffffff');
        root.style.setProperty('--tg-secondary-bg', tp.secondary_bg_color || '#1c1c1e');
    };

    applyTheme();
    webApp.onEvent('themeChanged', applyTheme);
}

createRoot(document.getElementById('root')!).render(<App />);
