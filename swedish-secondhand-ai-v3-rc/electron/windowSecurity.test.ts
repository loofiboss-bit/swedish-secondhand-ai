import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createWindowOptions, restrictWindowNavigation } = require('./window-security.cjs') as {
  createWindowOptions: (preloadPath: string) => {
    webPreferences: Record<string, unknown>;
  };
  restrictWindowNavigation: (webContents: Record<string, unknown>, allowedUrl: string) => void;
};

describe('Electron window security', () => {
  it('keeps the secure renderer defaults and a single preload entry point', () => {
    expect(createWindowOptions('/app/electron/preload.cjs').webPreferences).toEqual({
      preload: '/app/electron/preload.cjs',
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    });
  });

  it('denies new windows and blocks navigation outside the application entry URL', () => {
    let navigationHandler: ((event: { preventDefault(): void }, url: string) => void) | undefined;
    const setWindowOpenHandler = vi.fn();
    const webContents = {
      setWindowOpenHandler,
      on: vi.fn((eventName: string, handler: typeof navigationHandler) => {
        if (eventName === 'will-navigate') navigationHandler = handler;
      }),
    };
    restrictWindowNavigation(webContents, 'file:///app/dist/index.html');

    expect(setWindowOpenHandler.mock.calls[0][0]()).toEqual({ action: 'deny' });
    const preventDefault = vi.fn();
    navigationHandler?.({ preventDefault }, 'https://attacker.example/');
    expect(preventDefault).toHaveBeenCalledTimes(1);
    preventDefault.mockClear();
    navigationHandler?.({ preventDefault }, 'file:///app/dist/index.html');
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
