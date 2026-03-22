import {
  setDebug,
  themeParams,
  initData,
  viewport,
  init as initSDK,
  mockTelegramEnv,
  retrieveLaunchParams,
  emitEvent,
  miniApp,
  backButton,
} from '@tma.js/sdk-react';

/**
 * Initializes the application and configures its dependencies.
 */
export async function init(options: {
  debug: boolean;
  eruda: boolean;
  mockForMacOS: boolean;
}): Promise<void> {
  // Set @telegram-apps/sdk-react debug mode and initialize it.
  setDebug(options.debug);
  initSDK();

  // Eruda debug tool removed for production

  // Telegram for macOS has a ton of bugs, including cases, when the client doesn't
  // even response to the "web_app_request_theme" method. It also generates an incorrect
  // event for the "web_app_request_safe_area" method.
  if (options.mockForMacOS) {
    let firstThemeSent = false;
    mockTelegramEnv({
      onEvent(event, next) {
        if (event.name === 'web_app_request_theme') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let tp: any = {};
          if (firstThemeSent) {
            tp = themeParams.state();
          } else {
            firstThemeSent = true;
            tp ||= retrieveLaunchParams().tgWebAppThemeParams;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return emitEvent('theme_changed', { theme_params: tp } as any);
        }

        if (event.name === 'web_app_request_safe_area') {
          return emitEvent('safe_area_changed', { left: 0, top: 0, right: 0, bottom: 0 });
        }

        next();
      },
    });
  }

  // Mount all components used in the project.
  backButton.mount.ifAvailable();
  initData.restore();

  if (miniApp.mount.isAvailable()) {
    themeParams.mount();
    miniApp.mount();
    themeParams.bindCssVars();
  }

  if (viewport.mount.isAvailable()) {
    viewport.mount().then(() => {
      viewport.bindCssVars();
    });
  }

  // ── Telegram WebApp native features ──────────────────────────────────────
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();

    // Lock portrait orientation (vertical feed)
    if (typeof tg.lockOrientation === 'function') tg.lockOrientation();

    // Request fullscreen
    if (typeof tg.requestFullscreen === 'function') tg.requestFullscreen();

    // Safe area CSS variables (notch / navigation bar)
    function applySafeArea() {
      const sa = tg.safeAreaInset;
      if (!sa) return;
      document.documentElement.style.setProperty('--safe-area-top', `${sa.top ?? 0}px`);
      document.documentElement.style.setProperty('--safe-area-bottom', `${sa.bottom ?? 0}px`);
      document.documentElement.style.setProperty('--safe-area-left', `${sa.left ?? 0}px`);
      document.documentElement.style.setProperty('--safe-area-right', `${sa.right ?? 0}px`);
    }
    applySafeArea();
    tg.onEvent('safeAreaChanged', applySafeArea);

    // Re-enter fullscreen if the user swipes out
    tg.onEvent('fullscreenChanged', () => {
      if (!tg.isFullscreen && typeof tg.requestFullscreen === 'function') {
        setTimeout(() => tg.requestFullscreen(), 1000);
      }
    });

    tg.onEvent('fullscreenFailed', () => {
      console.log('[TokGram] Fullscreen not supported on this device');
    });
  }
}