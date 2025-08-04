import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { app, type BrowserWindow } from 'electron';
import { createServer } from 'http-server';
import log from 'electron-log';

import { type Child } from './bin';
import { getAvailablePort } from './port';
import { createWindow, focusWindow, getWindow } from './window';
import * as cache from './cache';

const debuggers: Map<string, { window: BrowserWindow; preview: Child; listener: number }> =
  new Map();

export function getDebugger(path: string) {
  return debuggers.get(path);
}

let inspectorServer: ReturnType<typeof createServer> | null = null;

export function killInspectorServer() {
  if (!inspectorServer) {
    return;
  }

  try {
    // Close the server and handle any errors
    inspectorServer.close(err => {
      if (err) {
        log.error('Error closing inspector server:', err);
      } else {
        log.info('Inspector server closed successfully');
      }
    });

    // Clear the reference
    inspectorServer = null;
  } catch (error) {
    log.error('Error killing inspector server:', error);
  }
}

export async function start() {
  if (inspectorServer) {
    killInspectorServer();
  }

  const port = await getAvailablePort();
  const inspectorPath = resolve(app.getAppPath(), 'node_modules', '@dcl', 'inspector', 'public');

  inspectorServer = createServer({ root: inspectorPath });
  inspectorServer.listen(port, () => {
    log.info(`Inspector running at http://localhost:${port}`);
  });

  return port;
}

export async function openSceneDebugger(path: string): Promise<string> {
  const alreadyOpen = getWindow(path);
  if (alreadyOpen) {
    focusWindow(alreadyOpen);
    return path;
  }

  const window = createWindow(path);
  window.setMenuBarVisibility(false);
  window.on('ready-to-show', () => window.show());

  if (import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined) {
    const url = join(import.meta.env.VITE_DEV_SERVER_URL, `debugger.html?path=${path}`);
    await window.loadURL(url);
  } else {
    await window.loadFile(
      fileURLToPath(new URL('./../../renderer/dist/debugger.html', import.meta.url)),
      { query: { path } },
    );
  }

  return path;
}

function assertDebuggerState(path: string) {
  const window = cache.getWindow(path);
  const preview = cache.getPreview(path);

  if (!window || window.isDestroyed()) {
    throw new Error(`Window not found for path: ${path}`);
  }

  if (!preview || !preview.child.alive()) {
    throw new Error(`Preview not found for path: ${path}`);
  }
}

function isDebuggerAttached(path: string, window: BrowserWindow, preview: Child): boolean {
  const _debugger = debuggers.get(path) ?? false;
  return _debugger && _debugger.window === window && _debugger.preview === preview;
}

export async function attachSceneDebugger(path: string, eventName: string): Promise<boolean> {
  assertDebuggerState(path);

  const window = cache.getWindow(path)!;
  const { child: preview } = cache.getPreview(path)!;

  focusWindow(window);

  if (isDebuggerAttached(path, window, preview)) {
    return false;
  }

  // Send all the current logs to the debugger window
  const stdall = preview.stdall({ sanitize: false });
  if (stdall.length > 0) {
    window.webContents.send(eventName, stdall);
  }
  // Attach the event listener to preview output to send future logs to debugger window
  const listener = preview.on(
    /(.*)/i,
    (data?: string) => {
      if (data) window.webContents.send(eventName, data);
    },
    { sanitize: false },
  );

  debuggers.set(path, { window, preview, listener });

  const cleanup = () => debuggers.delete(path);

  window.on('closed', () => {
    // Remove the event listener from the preview when the debugger window is closed
    preview.off(listener);
    cleanup();
  });
  preview.process.on('exit', () => {
    // Destoy debugger window when the preview process exits
    window.destroy();
    cleanup();
  });

  return true;
}
