interface TonIconProps {
  size?: number;
}

export function TonIcon({ size = 24 }: TonIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="28" cy="28" r="28" fill="#0098EA" />
      <path
        d="M37.117 15.498H18.883c-3.816 0-6.099 4.142-4.133 7.418L27.567 43.43a.52.52 0 00.9 0l12.783-20.514c1.966-3.276-.317-7.418-4.133-7.418zM26.25 38.35L23.04 32.99l-8.19-13.152c-.646-1.038.109-2.34 1.328-2.34H26.25v20.842zm9.9-19.502l-8.19 13.151-3.21 5.36v-20.81h10.072c1.22 0 1.974 1.302 1.328 2.34v-.041z"
        fill="white"
      />
    </svg>
  );
}
