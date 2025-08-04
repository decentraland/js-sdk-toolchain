import path from 'node:path';

export const SCENES_DIRECTORY = 'Scenes';
export const SETTINGS_DIRECTORY = 'Settings';
export const CUSTOM_ASSETS_DIRECTORY = 'Custom Items';
export const CONFIG_FILE_NAME = 'config.json';
export const INSTALLED_VERSION_FILE_NAME = 'installed-version.json';

export function getFullScenesPath(userDataPath: string): string {
  return path.join(userDataPath, SCENES_DIRECTORY);
}
