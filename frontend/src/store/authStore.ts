import { create } from 'zustand';
import api from '../lib/api';
import { getWebApp } from '../lib/telegram';
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
                if (res.data && res.data.id) {
                    set({ user: res.data, isLoading: false });
                    return;
                }
                // User not found in DB — token is stale
                throw new Error('stale token');
            } catch {
                localStorage.removeItem('token');
                set({ token: null });
            }
        }

        // Try Telegram login
        const webApp = getWebApp();
        const initData = webApp?.initData || '';

        if (!initData) {
            set({ isLoading: false, error: 'Not in Telegram (no initData)' });
            return;
        }

        try {
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
