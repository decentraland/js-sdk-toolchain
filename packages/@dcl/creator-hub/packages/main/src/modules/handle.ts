import { ipcMain } from 'electron';
import log from 'electron-log';
import * as Sentry from '@sentry/electron/main';

import type { Ipc, IpcError, IpcResult } from '/shared/types/ipc';

// wrapper for ipcMain.handle with types
export async function handle<T extends keyof Ipc>(
  channel: T,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: Parameters<Ipc[T]>) => ReturnType<Ipc[T]>,
) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      log.info(
        `[IPC] channel=${channel} ${args.map((arg, idx) => `args[${idx}]=${JSON.stringify(arg)}`).join(' ')}`.trim(),
      );
      const value = await handler(event, ...(args as Parameters<Ipc[T]>));
      const result: IpcResult<typeof value> = {
        success: true,
        value,
      };
      return result;
    } catch (error: any) {
      const name = error.name || 'Error';
      log.error(`[IPC] channel=${channel} name=${name} error=${error.message}`);
      Sentry.captureException(error, {
        tags: { source: 'ipc-handle' },
        extra: { channel },
      });
      const result: IpcError = {
        success: false,
        error: {
          message: error.message,
          name,
        },
      };
      return result;
    }
  });
}
