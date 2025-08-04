import deepmerge from 'deepmerge';
import { SCENES_DIRECTORY } from '/shared/paths';
import { type AppSettings } from './settings';
import { DEFAULT_DEPENDENCY_UPDATE_STRATEGY } from './settings';

export const CURRENT_CONFIG_VERSION = 2;

export type Config = {
  version: number;
  workspace: {
    paths: string[];
  };
  settings: AppSettings;
  userId?: string;
};

export const DEFAULT_CONFIG: Config = {
  version: CURRENT_CONFIG_VERSION,
  workspace: {
    paths: [],
  },
  settings: {
    scenesPath: SCENES_DIRECTORY, // Base directory name, will be joined with userDataPath by main/preload
    dependencyUpdateStrategy: DEFAULT_DEPENDENCY_UPDATE_STRATEGY,
    previewOptions: {
      debugger: false,
      skipAuthScreen: true,
      enableLandscapeTerrains: true,
      openNewInstance: false,
    },
  },
};

export function mergeConfig(target: Partial<Config>, source: Config): Config {
  return deepmerge(source, target, {
    // Clone arrays instead of merging them
    arrayMerge: (_, sourceArray) => sourceArray,
  });
}
