import type { ComponentType } from 'react';
import { FeedPage } from '@/pages/FeedPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { MyProfilePage } from '@/pages/MyProfilePage';
import { UserProfilePage } from '@/pages/UserProfilePage';
import { UserFeedPage } from '@/pages/UserFeedPage';
import { CreatorProfilePage } from '@/pages/CreatorProfilePage';
import { CreatorFeedPage } from '@/pages/CreatorFeedPage';

interface Route {
  path: string;
  Component: ComponentType;
}

export const routes: Route[] = [
  { path: '/', Component: FeedPage },
  { path: '/me', Component: MyProfilePage },
  { path: '/profile', Component: ProfilePage },
  { path: '/user/:telegramUserId', Component: UserProfilePage },
  { path: '/user/:telegramUserId/feed', Component: UserFeedPage },
  { path: '/creator/:creatorId', Component: CreatorProfilePage },
  { path: '/creator/:creatorId/feed', Component: CreatorFeedPage },
];
