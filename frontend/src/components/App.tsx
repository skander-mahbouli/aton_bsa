import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom';
import { useLaunchParams, useSignal, miniApp } from '@tma.js/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';

import { FeedPage } from '@/pages/FeedPage';
import { MyProfilePage } from '@/pages/MyProfilePage';
import { UserProfilePage } from '@/pages/UserProfilePage';
import { UserFeedPage } from '@/pages/UserFeedPage';

export function App() {
  const lp = useLaunchParams();
  const isDark = useSignal(miniApp.isDark);

  return (
    <AppRoot
      appearance={isDark ? 'dark' : 'light'}
      platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/me" element={<MyProfilePage />} />
          <Route path="/user/:telegramUserId" element={<UserProfilePage />} />
          <Route path="/user/:telegramUserId/feed" element={<UserFeedPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AppRoot>
  );
}
