import { vi, type Mock } from 'vitest';

import type { Services } from '../../src/services';

type DeepMock<T> = {
  [key in keyof T]: T[key] extends (...args: any[]) => any
    ? Mock<Parameters<T[key]>, ReturnType<T[key]>>
    : DeepMock<T[key]>;
};

export const getMockServices = (): DeepMock<Services> => ({
  config: {
    getConfigPath: vi.fn(),
    getConfig: vi.fn(),
    writeConfig: vi.fn(),
    setConfig: vi.fn(),
  },
  fs: {
    stat: vi.fn(),
    mkdir: vi.fn(),
    exists: vi.fn(),
    writeFile: vi.fn(),
    resolve: vi.fn(),
    readFile: vi.fn(),
    rm: vi.fn(),
    readdir: vi.fn(),
    isDirectory: vi.fn(),
    cp: vi.fn(),
  },
  ipc: {
    invoke: vi.fn(),
  },
  path: {
    join: vi.fn((...args) => args.join('/')),
  } as any, // temp until we have a "path" service...
  npm: {
    install: vi.fn(),
    getOutdatedDeps: vi.fn(),
  },
  pkg: {
    getPackageJson: vi.fn(),
    getPackageVersion: vi.fn(),
    hasDependency: vi.fn(),
  },
});
