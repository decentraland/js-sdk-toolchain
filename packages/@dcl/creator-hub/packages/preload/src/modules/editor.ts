import { ipcRenderer, type IpcRendererEvent } from 'electron';

import type { DeployOptions } from '/shared/types/deploy';

import { invoke } from '../services/ipc';
import type { PreviewOptions } from '/shared/types/settings';

export async function getVersion() {
  return invoke('electron.getAppVersion');
}

export async function install() {
  return invoke('bin.install');
}

export async function openCode(_path: string) {
  return invoke('bin.code', _path);
}

export async function startInspector() {
  const port = await invoke('inspector.start');
  return port;
}

export async function openSceneDebugger(path: string) {
  return invoke('inspector.openSceneDebugger', path);
}

export async function attachSceneDebugger(
  path: string,
  cb: (data: string) => void,
): Promise<{ cleanup: () => void }> {
  // TODO: what happens when there is no window or preview?
  const eventName = `debugger://${path}`;

  const attached = await invoke('inspector.attachSceneDebugger', path, eventName);
  if (!attached) return { cleanup: () => {} };

  const handler = (_: IpcRendererEvent, data: string) => cb(data);
  ipcRenderer.on(eventName, handler);

  return {
    cleanup: () => {
      ipcRenderer.off(eventName, handler);
    },
  };
}

export async function runScene({ path, opts }: { path: string; opts: PreviewOptions }) {
  const port = await invoke('cli.start', path, opts);
  return port;
}

export async function killPreviewScene(path: string) {
  const port = await invoke('cli.killPreview', path);
  return port;
}

export async function publishScene(opts: DeployOptions) {
  const port = await invoke('cli.deploy', opts);
  return port;
}

export async function openPreview(port: number) {
  const url = `http://localhost:${port}`;
  await invoke('electron.openExternal', url);
}

export async function openTutorial(opts: { id: string; list?: string }) {
  const { id, list } = opts;
  const url = `https://youtu.be/${id}${list ? `?list=${list}` : ''}`.trim();
  await invoke('electron.openExternal', url);
}

export async function openExternalURL(url: string) {
  await invoke('electron.openExternal', url);
}
