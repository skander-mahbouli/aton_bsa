import './polyfills';
import '@telegram-apps/telegram-ui/dist/styles.css';
import './index.css';

import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';
import { retrieveLaunchParams } from '@tma.js/sdk-react';

import { Root } from '@/components/Root';
import { EnvUnsupported } from '@/components/EnvUnsupported';
import { init } from '@/init';

// Mock env for dev outside Telegram
import './mockEnv';

const root = ReactDOM.createRoot(document.getElementById('root')!);

try {
  const launchParams = retrieveLaunchParams();
  const { tgWebAppPlatform: platform } = launchParams;
  const debug = (launchParams.tgWebAppStartParam || '').includes('debug')
    || import.meta.env.DEV;

  await init({
    debug,
    eruda: false,
    mockForMacOS: platform === 'macos',
  }).then(() => {
    root.render(
      <StrictMode>
        <Root />
      </StrictMode>,
    );
  });
} catch {
  root.render(<EnvUnsupported />);
}
