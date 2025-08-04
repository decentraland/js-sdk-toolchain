import path from 'path';
import updater from 'electron-updater';
import log from 'electron-log/main';
import semver from 'semver';
import * as Sentry from '@sentry/electron/main';
import { FileSystemStorage } from '/shared/types/storage';
import { INSTALLED_VERSION_FILE_NAME } from '/shared/paths';
import { getUserDataPath } from './electron';

export interface UpdaterConfig {
  autoDownload?: boolean;
}

type InstalledVersionData = {
  installed_version?: string;
};

const VERSION_FILE_PATH = path.join(getUserDataPath(), INSTALLED_VERSION_FILE_NAME);

export function setupUpdaterEvents(event?: Electron.IpcMainInvokeEvent) {
  updater.autoUpdater.on('checking-for-update', () => {
    log.info('[AutoUpdater] Checking for updates');
  });

  updater.autoUpdater.on('update-available', _info => {
    log.info('[AutoUpdater] Update available');
  });

  updater.autoUpdater.on('update-not-available', _info => {
    log.info('[AutoUpdater] Update not available');
  });

  updater.autoUpdater.on('update-downloaded', async info => {
    log.info(`[AutoUpdater] Update downloaded (v${info.version})`);
    event &&
      event.sender.send('updater.downloadProgress', {
        percent: 100,
        finished: true,
        version: info.version,
        isDownloading: false,
      });
  });

  updater.autoUpdater.on('download-progress', info => {
    log.info(`[AutoUpdater] Download progress ${info.percent.toFixed(2)}%`);
    event &&
      event.sender.send('updater.downloadProgress', {
        percent: info.percent.toFixed(0),
        finished: false,
        isDownloading: true,
      });
  });

  updater.autoUpdater.on('error', err => {
    event &&
      event.sender.send('updater.downloadProgress', {
        error: err.message,
      });
    Sentry.captureException(err, {
      tags: {
        source: 'auto-updater',
        event: 'error',
      },
      extra: {
        context: 'Electron auto-update process',
        currentVersion: updater.autoUpdater.currentVersion?.version,
      },
      level: 'error',
    });
  });
}

function configureUpdater(config: UpdaterConfig) {
  const { autoDownload } = config;
  updater.autoUpdater.autoDownload = autoDownload ?? false;
  updater.autoUpdater.autoInstallOnAppQuit = false;
}

export async function checkForUpdates(config: UpdaterConfig = {}) {
  try {
    configureUpdater(config);
    const result = await updater.autoUpdater.checkForUpdates();
    const version = result?.updateInfo?.version ?? null;
    const currentVersion = updater.autoUpdater.currentVersion?.version;
    return { updateAvailable: !!(version && semver.gt(version, currentVersion)), version };
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: {
        source: 'auto-updater',
        event: 'check-for-updates',
      },
      extra: {
        context: 'Electron auto-update process main',
      },
      level: 'error',
    });
    log.error('[AutoUpdater] Failed check and install updates:', error.message);
    throw error;
  }
}

export async function quitAndInstall(version: string) {
  try {
    await updater.autoUpdater.quitAndInstall();
    if (version) {
      await writeInstalledVersion(version);
    }
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: {
        source: 'auto-updater',
        event: 'quit-and-install',
      },
      extra: {
        context: 'Electron installation',
      },
      level: 'error',
    });
    log.error('[AutoUpdater] Error installing update:', error);
    return error;
  }
}

export async function downloadUpdate() {
  try {
    return await updater.autoUpdater.downloadUpdate();
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: {
        source: 'auto-updater',
        event: 'download-update',
      },
      level: 'error',
    });
    log.error('[AutoUpdater] Error downloading update:', error);
    throw error;
  }
}

export async function writeInstalledVersion(version: string): Promise<void> {
  const storage = await FileSystemStorage.getOrCreate<InstalledVersionData>(VERSION_FILE_PATH);
  await storage.set('installed_version', version);
}

export async function getInstalledVersion(): Promise<string | undefined> {
  try {
    const storage = await FileSystemStorage.getOrCreate<InstalledVersionData>(VERSION_FILE_PATH);
    return await storage?.get('installed_version');
  } catch (error) {
    console.error('Error getting installed version:', error);
    return undefined;
  }
}

export async function deleteVersionFile(): Promise<void> {
  try {
    await FileSystemStorage.deleteFile(VERSION_FILE_PATH);
    log.info('Deleted version file:', VERSION_FILE_PATH);
  } catch (error) {
    log.error('Error deleting version file:', error);
  }
}
