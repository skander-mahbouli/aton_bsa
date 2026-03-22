import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import FeedPage from './pages/FeedPage';
import CreatePage from './pages/CreatePage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import InboxPage from './pages/InboxPage';
import BottomNav from './components/BottomNav';

function DeepLinkHandler() {
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const WebApp = (await import('@twa-dev/sdk')).default;
                const param = WebApp.initDataUnsafe?.start_param;
                if (param?.startsWith('v_')) navigate(`/?video=${param.slice(2)}`);
                else if (param?.startsWith('u_')) navigate(`/profile/${param.slice(2)}`);
            } catch {
                // Not in Telegram
            }
        })();
    }, [navigate]);

    return null;
}

export default function App() {
    const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
    const { login, isLoading } = useAuthStore();
    const showNav = useUiStore((s) => s.showNav);

    useEffect(() => {
        login();
    }, [login]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center"
                style={{ color: 'var(--tg-hint)' }}>
                Loading...
            </div>
        );
    }

    return (
        <TonConnectUIProvider manifestUrl={manifestUrl}>
            <BrowserRouter>
                <DeepLinkHandler />
                <div className="h-full flex flex-col">
                    <main className={`flex-1 overflow-hidden ${showNav ? 'pb-14' : ''}`}>
                        <Routes>
                            <Route path="/" element={<FeedPage />} />
                            <Route path="/create" element={<CreatePage />} />
                            <Route path="/profile/:userId?" element={<ProfilePage />} />
                            <Route path="/explore" element={<ExplorePage />} />
                            <Route path="/inbox" element={<InboxPage />} />
                        </Routes>
                    </main>
                    {showNav && <BottomNav />}
                </div>
            </BrowserRouter>
        </TonConnectUIProvider>
    );
}
