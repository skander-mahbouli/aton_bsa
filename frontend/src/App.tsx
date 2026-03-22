import { useEffect, useState } from 'react';
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

// Temporary debug — remove after auth is confirmed working
function DebugOverlay() {
    const { user, token, error } = useAuthStore();
    const [debugInfo, setDebugInfo] = useState('checking...');
    const [show, setShow] = useState(true);

    useEffect(() => {
        const info: string[] = [];
        info.push(`API: ${import.meta.env.VITE_API_URL || 'NOT SET'}`);

        const webApp = getWebApp();
        info.push(`WebApp: ${webApp ? 'loaded' : 'NOT FOUND'}`);
        info.push(`initData: ${webApp?.initData ? webApp.initData.slice(0, 60) + '...' : 'EMPTY'}`);
        info.push(`platform: ${webApp?.platform || 'unknown'}`);
        info.push(`token: ${token ? 'yes' : 'none'}`);
        info.push(`user: ${user ? user.name : 'null'}`);
        info.push(`error: ${error || 'none'}`);

        setDebugInfo(info.join('\n'));
    }, [user, token, error]);

    if (!show) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[999] p-2" style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
            <pre className="text-[10px] text-green-400 whitespace-pre-wrap font-mono">{debugInfo}</pre>
            <button onClick={() => setShow(false)} className="text-[10px] text-red-400 mt-1 bg-transparent border-none cursor-pointer">
                [close]
            </button>
        </div>
    );
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
                <DebugOverlay />
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
