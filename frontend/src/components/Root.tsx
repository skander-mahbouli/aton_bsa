import { useEffect, useState } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

import { App } from '@/components/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthStore } from '@/store/authStore';
import { publicUrl } from '@/helpers/publicUrl';

function ErrorBoundaryError({ error }: { error: unknown }) {
  return (
    <div style={{ padding: 20, color: '#fff', background: '#000' }}>
      <p>An error occurred:</p>
      <code>{error instanceof Error ? error.message : JSON.stringify(error)}</code>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { login, isLoading } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    login().finally(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading && !ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #fe2c55', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return <>{children}</>;
}

export function Root() {
  return (
    <ErrorBoundary fallback={ErrorBoundaryError}>
      <TonConnectUIProvider
        manifestUrl={publicUrl('tonconnect-manifest.json')}
        actionsConfiguration={{ twaReturnUrl: `https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'tikton_bot'}/app` }}
      >
        <AuthGate>
          <App />
        </AuthGate>
      </TonConnectUIProvider>
    </ErrorBoundary>
  );
}
