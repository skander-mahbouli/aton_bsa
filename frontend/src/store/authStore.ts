import { create } from 'zustand';
import api from '../lib/api';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    login: () => Promise<void>;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: localStorage.getItem('token'),
    isLoading: true,
    error: null,

    login: async () => {
        set({ isLoading: true, error: null });

        // If we already have a token, try to use it
        const existingToken = get().token;
        if (existingToken) {
            try {
                const res = await api.get<User>('/api/users/me');
                set({ user: res.data, isLoading: false });
                return;
            } catch {
                // Token expired or invalid, clear it and try fresh login
                localStorage.removeItem('token');
                set({ token: null });
            }
        }

        // Try Telegram login
        try {
            let initData = '';
            try {
                const WebApp = (await import('@twa-dev/sdk')).default;
                initData = WebApp.initData || '';
            } catch {
                // Not in Telegram
            }

            if (!initData) {
                set({ isLoading: false, error: 'Not in Telegram' });
                return;
            }

            const res = await api.post<{ token: string; user: User }>('/api/auth/telegram', {
                initData,
            });

            const { token, user } = res.data;
            localStorage.setItem('token', token);
            set({ token, user, isLoading: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Auth failed';
            set({ isLoading: false, error: message });
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
    },
}));
