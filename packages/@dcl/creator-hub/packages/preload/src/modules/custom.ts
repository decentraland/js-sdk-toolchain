import path from 'path';
import { CUSTOM_ASSETS_DIRECTORY } from '/shared/paths';
import { invoke } from '../services/ipc';

export async function getPath() {
  const userDataPath = await invoke('electron.getUserDataPath');
  return path.join(userDataPath, CUSTOM_ASSETS_DIRECTORY);
}
