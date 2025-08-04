import { ipcRenderer } from 'electron';
import type { Ipc, IpcError, IpcResult } from '/shared/types/ipc';

// wrapper for ipcRenderer.invoke with types
export async function invoke<T extends keyof Ipc>(
  channel: T,
  ...args: Parameters<Ipc[T]>
): Promise<Awaited<ReturnType<Ipc[T]>>> {
  const result = await (ipcRenderer.invoke(channel, ...args) as Promise<
    IpcResult<Awaited<ReturnType<Ipc[T]>>> | IpcError
  >);
  if (result.success) {
    return result.value;
  } else {
    const error = new Error(result.error.message);
    error.name = result.error.name;
    throw error;
  }
}
