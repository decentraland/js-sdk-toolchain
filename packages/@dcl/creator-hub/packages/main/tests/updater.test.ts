import { beforeEach, describe, expect, test, vi } from 'vitest';
import { autoUpdater } from 'electron-updater';
import type { UpdateInfo, UpdateCheckResult } from 'electron-updater';
import {
  checkForUpdates,
  setupUpdaterEvents,
  writeInstalledVersion,
  getInstalledVersion,
  deleteVersionFile,
} from '../src/modules/updater';

vi.mock('electron', () => {
  return {
    app: {
      getPath: vi.fn().mockReturnValue('/mock/user/data/path'),
    },
  };
});

vi.mock('@sentry/electron/main', () => {
  const mockCaptureException = vi.fn();
  return {
    __esModule: true,
    captureException: mockCaptureException,
    default: { captureException: mockCaptureException },
  };
});

vi.mock('electron-updater', () => {
  const autoUpdater = {
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    autoDownload: false,
    autoInstallOnAppQuit: false,
    setFeedURL: vi.fn(),
    currentVersion: { version: '1.0.0' },
  };
  return {
    default: { autoUpdater },
    autoUpdater,
  };
});

vi.mock('/shared/types/storage', () => {
  const fileSystemStorageMocks = {
    set: vi.fn(),
    get: vi.fn(),
    deleteFile: vi.fn(),
  };

  globalThis.__fileSystemStorageMocks__ = fileSystemStorageMocks;

  return {
    FileSystemStorage: {
      getOrCreate: vi.fn().mockResolvedValue({
        set: fileSystemStorageMocks.set,
        get: fileSystemStorageMocks.get,
        deleteFile: fileSystemStorageMocks.deleteFile,
      }),
      deleteFile: fileSystemStorageMocks.deleteFile,
    },
  };
});

describe('Updater Module', () => {
  const mockEvent = {
    sender: {
      send: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    autoUpdater.currentVersion.version = '3.4.0';
    vi.clearAllMocks();
  });

  describe('checkForUpdates', () => {
    test('should return updateAvailable true when a newer version is available', async () => {
      const updateInfo: UpdateInfo = {
        version: '5.0.0',
        files: [],
        path: '',
        sha512: '',
        releaseDate: new Date().toISOString(),
      };
      const result: UpdateCheckResult = {
        updateInfo,
        versionInfo: updateInfo,
      };
      vi.mocked(autoUpdater.checkForUpdates).mockResolvedValueOnce(result);

      const response = await checkForUpdates({ autoDownload: false });

      expect(response).toEqual({
        updateAvailable: true,
        version: '5.0.0',
      });
    });

    test('should return updateAvailable false when current version is the same as the latest version', async () => {
      const updateInfo: UpdateInfo = {
        version: '3.4.0',
        files: [],
        path: '',
        sha512: '',
        releaseDate: new Date().toISOString(),
      };
      const result: UpdateCheckResult = {
        updateInfo,
        versionInfo: updateInfo,
      };
      vi.mocked(autoUpdater.checkForUpdates).mockResolvedValueOnce(result);

      const response = await checkForUpdates({ autoDownload: false });

      expect(response).toEqual({
        updateAvailable: false,
        version: '3.4.0',
      });
    });

    test('should return updateAvailable false when received version is older than current', async () => {
      const updateInfo: UpdateInfo = {
        version: '2.0.0',
        files: [],
        path: '',
        sha512: '',
        releaseDate: new Date().toISOString(),
      };

      const result: UpdateCheckResult = {
        updateInfo,
        versionInfo: updateInfo,
      };

      vi.mocked(autoUpdater.checkForUpdates).mockResolvedValueOnce(result);

      const response = await checkForUpdates({ autoDownload: false });

      expect(response).toEqual({
        updateAvailable: false,
        version: '2.0.0',
      });
    });

    test('should handle errors and capture exception', async () => {
      const error = new Error('Update check failed');
      vi.mocked(autoUpdater.checkForUpdates).mockRejectedValueOnce(error);

      await expect(checkForUpdates({ autoDownload: false })).rejects.toThrow('Update check failed');
    });

    test('should configure autoDownload to true when passed in config', async () => {
      const updateInfo: UpdateInfo = {
        version: '2.0.0',
        files: [],
        path: '',
        sha512: '',
        releaseDate: new Date().toISOString(),
      };
      const result: UpdateCheckResult = {
        updateInfo,
        versionInfo: updateInfo,
      };

      vi.mocked(autoUpdater.checkForUpdates).mockResolvedValueOnce(result);

      await checkForUpdates({ autoDownload: true });

      expect(autoUpdater.autoDownload).toBe(true);
    });

    test('setupUpdaterEvents registers all expected event handlers', () => {
      setupUpdaterEvents(mockEvent);

      const expectedEvents = [
        'checking-for-update',
        'update-available',
        'update-not-available',
        'update-downloaded',
        'download-progress',
        'error',
      ];

      expectedEvents.forEach(event =>
        expect(autoUpdater.on).toHaveBeenCalledWith(event, expect.any(Function)),
      );
    });
  });
});

describe('Installed Version File', () => {
  test('should write installed version', async () => {
    const version = '5.6.7';
    await writeInstalledVersion(version);
    expect(globalThis.__fileSystemStorageMocks__.set).toHaveBeenCalledWith(
      'installed_version',
      version,
    );
  });

  test('should read installed version', async () => {
    globalThis.__fileSystemStorageMocks__.get.mockResolvedValueOnce('5.6.7');
    const version = await getInstalledVersion();
    expect(version).toBe('5.6.7');
  });

  test('should delete version file', async () => {
    await deleteVersionFile();
    expect(globalThis.__fileSystemStorageMocks__.deleteFile).toHaveBeenCalled();
  });
});
