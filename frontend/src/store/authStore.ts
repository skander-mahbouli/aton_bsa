import { create } from 'zustand';
import api from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    login: () => Promise<void>;
    logout: () => void;
}

function getInitData(): string {
    // Access the raw initData string from Telegram's injected WebApp
    const tg = (window as any).Telegram?.WebApp;
    return tg?.initData || '';
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: localStorage.getItem('token'),
    isLoading: true,
    error: null,

    login: async () => {
        set({ isLoading: true, error: null });

        // Try existing token first
        const existingToken = get().token;
        if (existingToken) {
            try {
                const res = await api.get<User>('/api/users/me');
                if (res.data && res.data.id) {
                    set({ user: res.data, isLoading: false });
                    return;
                }
                throw new Error('stale');
            } catch {
                localStorage.removeItem('token');
                set({ token: null });
            }
        }

        // Telegram login
        const initData = getInitData();
        if (!initData) {
            set({ isLoading: false, error: 'Not in Telegram' });
            return;
        }

        try {
            const res = await api.post<{ token: string; user: User }>('/api/auth/telegram', { initData });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            set({ token, user, isLoading: false });
        } catch (err) {
            set({ isLoading: false, error: err instanceof Error ? err.message : 'Auth failed' });
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
    },
}));
