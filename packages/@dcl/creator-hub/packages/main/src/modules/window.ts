import { join } from 'node:path';
import { app, BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';

const activeWindows = new Map<string, BrowserWindow>();

export function createWindow(path: string, options?: BrowserWindowConstructorOptions) {
  const window = new BrowserWindow({
    show: false, // Use the 'ready-to-show' event to show the instantiated BrowserWindow.
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Sandbox disabled because the demo of preload script depend on the Node.js api
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like an iframe or Electron's BrowserView. @see https://www.electronjs.org/docs/latest/api/webview-tag#warning
      preload: join(app.getAppPath(), 'packages/preload/dist/index.mjs'),
      ...options,
    },
  });

  // Setup active windows map. We don't want to use window.id because we want to identify the window by the path WE give it
  activeWindows.set(path, window);
  window.on('closed', () => activeWindows.delete(path));

  return window;
}

export function getWindow(path: string): BrowserWindow | undefined {
  return activeWindows.get(path);
}

export function focusWindow(window: BrowserWindow): void {
  if (window) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
}

export function destroyAllWindows(): void {
  activeWindows.forEach(window => window.destroy());
  activeWindows.clear();
}
