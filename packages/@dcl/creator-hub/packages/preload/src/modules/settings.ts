import path from 'path';
import { ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  DEPENDENCY_UPDATE_STRATEGY,
  DEFAULT_DEPENDENCY_UPDATE_STRATEGY,
} from '/shared/types/settings';
import type { AppSettings } from '/shared/types/settings';
import { SCENES_DIRECTORY } from '/shared/paths';

import { invoke } from '../services/ipc';
import { getConfig, setConfig } from '../services/config';

export async function getDefaultScenesPath() {
  const userDataPath = await invoke('electron.getUserDataPath');
  return path.join(userDataPath, SCENES_DIRECTORY);
}

export async function getScenesPath() {
  const config = await getConfig();
  return config.settings?.scenesPath ?? (await getDefaultScenesPath());
}

export function isValidUpdateStrategy(value?: string): value is DEPENDENCY_UPDATE_STRATEGY {
  return Object.values(DEPENDENCY_UPDATE_STRATEGY).includes(value as DEPENDENCY_UPDATE_STRATEGY);
}

export async function getUpdateDependenciesStrategy() {
  const { dependencyUpdateStrategy } = (await getConfig()).settings;
  if (isValidUpdateStrategy(dependencyUpdateStrategy)) return dependencyUpdateStrategy;
  return DEFAULT_DEPENDENCY_UPDATE_STRATEGY;
}

export async function updateAppSettings(settings: AppSettings) {
  // update app settings on config file
  await setConfig(config => (config.settings = settings));
}

export async function selectSceneFolder(): Promise<string | undefined> {
  const [projectPath] = await invoke('electron.showOpenDialog', {
    title: 'Select Scenes Folder',
    properties: ['openDirectory'],
  });

  return projectPath;
}

export async function checkForUpdates(config?: { autoDownload?: boolean }) {
  return await invoke('updater.checkForUpdates', config);
}

export async function getDownloadedVersion() {
  return await invoke('updater.getDownloadedVersion');
}

export async function quitAndInstall(version: string) {
  return await invoke('updater.quitAndInstall', version);
}

export async function downloadUpdate() {
  return await invoke('updater.downloadUpdate');
}

export async function setupUpdaterEvents() {
  return await invoke('updater.setupUpdaterEvents');
}

export async function getInstalledVersion() {
  return await invoke('updater.getInstalledVersion');
}

export async function deleteVersionFile() {
  return await invoke('updater.deleteVersionFile');
}

export function downloadingStatus(
  cb: (
    event: IpcRendererEvent,
    progress: {
      percent: number;
      finished: boolean;
      version: string | null;
      isDownloading: boolean;
      error?: string;
    },
  ) => void,
) {
  ipcRenderer.on('updater.downloadProgress', cb);
  return {
    cleanup: () => {
      ipcRenderer.off('updater.downloadProgress', cb);
    },
  };
}
export function getCurrentVersion() {
  throw new Error('Function not implemented.');
}
