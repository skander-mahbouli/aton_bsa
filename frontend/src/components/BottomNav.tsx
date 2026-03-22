import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/explore', label: 'Explore', icon: SearchIcon },
    { path: '/create', label: '', icon: PlusIcon, isCreate: true },
    { path: '/inbox', label: 'Inbox', icon: InboxIcon },
    { path: '/profile', label: 'Profile', icon: ProfileIcon },
];

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 px-1 z-50"
            style={{ backgroundColor: 'var(--tg-bg)', borderTop: '1px solid var(--tg-secondary-bg)' }}>
            {navItems.map((item) => {
                const isActive = item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);

                if (item.isCreate) {
                    return (
                        <button key={item.path} onClick={() => navigate(item.path)}
                            className="flex items-center justify-center w-12 h-8 rounded-lg"
                            style={{ backgroundColor: 'var(--tg-button)' }}>
                            <item.icon color="var(--tg-button-text)" />
                        </button>
                    );
                }

                return (
                    <button key={item.path} onClick={() => navigate(item.path)}
                        className="flex flex-col items-center gap-0.5 min-w-[48px] bg-transparent border-none cursor-pointer">
                        <item.icon color={isActive ? 'var(--tg-button)' : 'var(--tg-hint)'} />
                        <span className="text-[10px]"
                            style={{ color: isActive ? 'var(--tg-button)' : 'var(--tg-hint)' }}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}

function HomeIcon({ color }: { color: string }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function SearchIcon({ color }: { color: string }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function PlusIcon({ color }: { color: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function InboxIcon({ color }: { color: string }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    );
}

function ProfileIcon({ color }: { color: string }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}
