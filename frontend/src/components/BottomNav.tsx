import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/explore', label: 'Discover', icon: SearchIcon },
    { path: '/create', label: '', icon: PlusIcon, isCreate: true },
    { path: '/inbox', label: 'Inbox', icon: InboxIcon },
    { path: '/profile', label: 'Me', icon: ProfileIcon },
];

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <nav className="fixed bottom-0 left-0 right-0 flex items-end justify-around pb-1 pt-1.5 z-50 safe-bottom"
            style={{ backgroundColor: '#000', borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
            {navItems.map((item) => {
                const isActive = item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);

                if (item.isCreate) {
                    return (
                        <button key={item.path} onClick={() => navigate(item.path)}
                            className="flex items-center justify-center w-11 h-8 rounded-lg border-none cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #25f4ee, #fe2c55)' }}>
                            <item.icon color="#fff" />
                        </button>
                    );
                }

                return (
                    <button key={item.path} onClick={() => navigate(item.path)}
                        className="flex flex-col items-center gap-0.5 min-w-[48px] bg-transparent border-none cursor-pointer py-1">
                        <item.icon color={isActive ? '#fff' : 'rgba(255,255,255,0.5)'} />
                        <span className="text-[10px] leading-tight"
                            style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.5)' }}>
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill={color} stroke="none">
            <path d="M12 3l9 7.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V10.5L12 3z" />
        </svg>
    );
}

function SearchIcon({ color }: { color: string }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function PlusIcon({ color }: { color: string }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function InboxIcon({ color }: { color: string }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
    );
}

function ProfileIcon({ color }: { color: string }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}
