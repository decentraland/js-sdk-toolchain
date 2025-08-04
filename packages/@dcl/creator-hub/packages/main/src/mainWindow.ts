import { fileURLToPath } from 'node:url';
import { type BrowserWindow } from 'electron';

import { createWindow, focusWindow, getWindow } from './modules/window';

async function createMainWindow(id: string) {
  const window = createWindow(id);
  window.setMenuBarVisibility(false);
  window.maximize();

  /**
   * If the 'show' property of the BrowserWindow's constructor is omitted from the initialization options,
   * it then defaults to 'true'. This can cause flickering as the window loads the html content,
   * and it also has show problematic behaviour with the closing of the window.
   * Use `show: false` and listen to the  `ready-to-show` event to show the window.
   *
   * @see https://github.com/electron/electron/issues/25012 for the afford mentioned issue.
   */
  window.on('ready-to-show', () => {
    window.show();

    if (import.meta.env.DEV) {
      window?.webContents.openDevTools();
    }
  });

  /**
   * Load the main page of the main window.
   */
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined) {
    /**
     * Load from the Vite dev server for development.
     */
    await window.loadURL(import.meta.env.VITE_DEV_SERVER_URL);
  } else {
    /**
     * Load from the local file system for production and test.
     *
     * Use BrowserWindow.loadFile() instead of BrowserWindow.loadURL() for WhatWG URL API limitations
     * when path contains special characters like `#`.
     * Let electron handle the path quirks.
     * @see https://github.com/nodejs/node/issues/12682
     * @see https://github.com/electron/electron/issues/6869
     */
    await window.loadFile(
      fileURLToPath(new URL('./../../renderer/dist/index.html', import.meta.url)),
    );
  }

  return window;
}

/**
 * Restores an existing main window or creates a new one if none exists.
 * This function ensures only one main window is active at a time.
 *
 * The function will:
 * 1. Check if a main window already exists
 * 2. Create a new window if none exists
 * 3. Restore the window if it's minimized
 * 4. Focus the window to bring it to the foreground
 *
 * @returns {Promise<Electron.BrowserWindow>} A promise that resolves to the main window instance
 */
export async function restoreOrCreateMainWindow(): Promise<BrowserWindow> {
  const id = 'main';
  let window = getWindow(id);

  if (window === undefined) {
    window = await createMainWindow(id);
  }

  focusWindow(window);

  return window;
}
