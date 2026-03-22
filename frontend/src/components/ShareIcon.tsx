interface ShareIconProps {
  size?: number;
}

// Telegram-style paper plane send icon
export function ShareIcon({ size = 28 }: ShareIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: 'block', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
    >
      <path
        d="M22 2L11 13"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22l-4-9-9-4 20-7z"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
