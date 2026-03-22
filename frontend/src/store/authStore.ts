import { create } from 'zustand';
import WebApp from '@twa-dev/sdk';
import api from '../lib/api';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: () => Promise<void>;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: localStorage.getItem('token'),
    isLoading: true,

    login: async () => {
        set({ isLoading: true });

        try {
            const initData = WebApp.initData;

            if (!initData) {
                // Dev mode — no Telegram context
                set({ isLoading: false });
                return;
            }

            const res = await api.post<{ token: string; user: User }>('/api/auth/telegram', {
                initData,
            });

            const { token, user } = res.data;
            localStorage.setItem('token', token);
            set({ token, user, isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
    },
}));
