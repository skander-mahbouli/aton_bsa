// TokGram logo — Telegram-style blue gradient with a play triangle inside a chat bubble
export function TokGramLogo() {
  return (
    <div className="tokgram-logo">
      {/* Icon: chat bubble + play */}
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <defs>
          <linearGradient id="tggrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#40B3E0" />
            <stop offset="100%" stopColor="#0077B6" />
          </linearGradient>
        </defs>
        {/* Rounded chat bubble */}
        <rect x="1" y="1" width="22" height="20" rx="7" fill="url(#tggrad)" />
        {/* Tail */}
        <path d="M7 21l-4 5 8-5H7z" fill="url(#tggrad)" />
        {/* Play triangle */}
        <path d="M9 8.5l9 5-9 5V8.5z" fill="#fff" />
      </svg>
      <span className="tokgram-logo-text">TokGram</span>
    </div>
  );
}
