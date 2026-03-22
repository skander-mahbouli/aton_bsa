import { create } from 'zustand';

interface UiState {
    showNav: boolean;
    soundEnabled: boolean;
    setShowNav: (show: boolean) => void;
    setSoundEnabled: (enabled: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
    showNav: true,
    soundEnabled: false,
    setShowNav: (show) => set({ showNav: show }),
    setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
}));
