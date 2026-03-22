interface HeartIconProps {
  filled: boolean;
  size?: number;
}

export function HeartIcon({ filled, size = 28 }: HeartIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#0088cc' : 'none'}
      stroke={filled ? '#0088cc' : '#fff'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', filter: filled ? 'drop-shadow(0 0 6px rgba(0,136,204,0.6))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
