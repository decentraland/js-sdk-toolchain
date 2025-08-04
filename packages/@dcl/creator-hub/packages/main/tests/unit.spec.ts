import type { MockedClass, MockedObject } from 'vitest';
import { beforeEach, expect, test, vi } from 'vitest';
import { BrowserWindow } from 'electron';

import { restoreOrCreateMainWindow } from '../src/mainWindow';
import { destroyAllWindows } from '../src/modules/window';

/**
 * Mock real electron BrowserWindow API
 */
vi.mock('electron', () => {
  // Use "as unknown as" because vi.fn() does not have static methods
  const bw = vi.fn() as unknown as MockedClass<typeof BrowserWindow>;
  bw.getAllWindows = vi.fn(() => bw.mock.instances);
  bw.prototype.loadURL = vi.fn((_: string, __?: Electron.LoadURLOptions) => Promise.resolve());
  bw.prototype.loadFile = vi.fn((_: string, __?: Electron.LoadFileOptions) => Promise.resolve());
  // Use "any" because the on function is overloaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bw.prototype.on = vi.fn<any>();
  bw.prototype.destroy = vi.fn();
  bw.prototype.isDestroyed = vi.fn();
  bw.prototype.isMinimized = vi.fn();
  bw.prototype.focus = vi.fn();
  bw.prototype.restore = vi.fn();
  bw.prototype.setMenuBarVisibility = vi.fn();
  bw.prototype.maximize = vi.fn();

  const app: Pick<Electron.App, 'getAppPath'> = {
    getAppPath(): string {
      return '';
    },
  };

  return { BrowserWindow: bw, app };
});

beforeEach(() => {
  vi.clearAllMocks();
  destroyAllWindows();
});

test('Should create the main window', async () => {
  const { mock } = vi.mocked(BrowserWindow);
  expect(mock.instances).toHaveLength(0);

  await restoreOrCreateMainWindow();
  expect(mock.instances).toHaveLength(1);
  const instance = mock.instances[0] as MockedObject<BrowserWindow>;
  const loadURLCalls = instance.loadURL.mock.calls.length;
  const loadFileCalls = instance.loadFile.mock.calls.length;
  expect(loadURLCalls + loadFileCalls).toBe(1);
  if (loadURLCalls === 1) {
    expect(instance.loadURL).toHaveBeenCalledWith(expect.stringMatching(/index\.html$/));
  } else {
    expect(instance.loadFile).toHaveBeenCalledWith(expect.stringMatching(/index\.html$/));
  }
});

test('Should restore an existing window', async () => {
  const { mock } = vi.mocked(BrowserWindow);

  // Create a window and minimize it.
  await restoreOrCreateMainWindow();
  expect(mock.instances).toHaveLength(1);
  const appWindow = vi.mocked(mock.instances[0]);
  appWindow.isMinimized.mockReturnValueOnce(true);

  await restoreOrCreateMainWindow();
  expect(mock.instances).toHaveLength(1);
  expect(appWindow.restore).toHaveBeenCalledOnce();
});

test('Should create a new window if the previous one was destroyed', async () => {
  const { mock } = vi.mocked(BrowserWindow);

  // Create a window and destroy it.
  await restoreOrCreateMainWindow();
  expect(mock.instances).toHaveLength(1);
  const appWindow = vi.mocked(mock.instances[0]);
  appWindow.isDestroyed.mockReturnValueOnce(true);

  destroyAllWindows();

  await restoreOrCreateMainWindow();
  expect(mock.instances).toHaveLength(2);
});
