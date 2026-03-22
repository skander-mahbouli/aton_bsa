import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import { getWebApp } from './lib/telegram';
import FeedPage from './pages/FeedPage';
import CreatePage from './pages/CreatePage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import InboxPage from './pages/InboxPage';
import DashboardPage from './pages/DashboardPage';
import BottomNav from './components/BottomNav';

function DeepLinkHandler() {
    const navigate = useNavigate();

    useEffect(() => {
        const webApp = getWebApp();
        const param = webApp?.initDataUnsafe?.start_param;
        if (param?.startsWith('v_')) navigate(`/?video=${param.slice(2)}`);
        else if (param?.startsWith('u_')) navigate(`/profile/${param.slice(2)}`);
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
            <div className="h-full flex flex-col items-center justify-center gap-3"
                style={{ backgroundColor: '#000' }}>
                <div className="w-10 h-10 border-2 border-white/20 border-t-[#fe2c55] rounded-full animate-spin" />
                <span className="text-white/40 text-sm">Loading...</span>
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
                            <Route path="/dashboard" element={<DashboardPage />} />
                        </Routes>
                    </main>
                    {showNav && <BottomNav />}
                </div>
            </BrowserRouter>
        </TonConnectUIProvider>
    );
}
