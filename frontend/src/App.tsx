import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import FeedPage from './pages/FeedPage';
import CreatePage from './pages/CreatePage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import InboxPage from './pages/InboxPage';
import BottomNav from './components/BottomNav';

export default function App() {
    const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

    return (
        <TonConnectUIProvider manifestUrl={manifestUrl}>
            <BrowserRouter>
                <div className="h-full flex flex-col">
                    <main className="flex-1 overflow-hidden pb-14">
                        <Routes>
                            <Route path="/" element={<FeedPage />} />
                            <Route path="/create" element={<CreatePage />} />
                            <Route path="/profile/:userId?" element={<ProfilePage />} />
                            <Route path="/explore" element={<ExplorePage />} />
                            <Route path="/inbox" element={<InboxPage />} />
                        </Routes>
                    </main>
                    <BottomNav />
                </div>
            </BrowserRouter>
        </TonConnectUIProvider>
    );
}
