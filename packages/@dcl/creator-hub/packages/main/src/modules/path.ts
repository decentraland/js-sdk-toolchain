import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { type PackageJson } from '/shared/types/pkg';

/**
 * The path to the unpacked app
 */
export const APP_UNPACKED_PATH = path.join(
  app.getAppPath(),
  import.meta.env.DEV ? '.' : '../app.asar.unpacked',
);

/**
 * Returns the path to a particular bin
 * @param pkg The name of the package
 * @param bin The name of the bin
 * @param workspace The path to the workspace, where the `node_modules` folder is located
 * @returns
 */
export function getBinPath(pkg: string, bin: string, workspace: string = APP_UNPACKED_PATH) {
  const pkgPath = path.join(workspace, './node_modules', pkg);
  let pkgJson: PackageJson;
  try {
    pkgJson = JSON.parse(fs.readFileSync(path.join(pkgPath, 'package.json'), 'utf8'));
  } catch (error) {
    throw new Error(`Could not find package.json for module "${pkg}" in ${pkgPath}`);
  }

  if (!pkgJson.bin || !pkgJson.bin[bin]) {
    throw new Error(`Could not find bin "${bin}" in package.json for module "${pkg}"`);
  }

  return path.join(pkgPath, pkgJson.bin[bin]);
}

/**
 * Helper to get the absolute path to the node bin given the user platform
 * @returns The path to the node bin
 */
export function getNodeCmdPath() {
  const cmd = process.platform === 'win32' ? 'node.cmd' : 'node';
  return path.join(APP_UNPACKED_PATH, cmd);
}

/**
 * Combines different paths as a single env PATH using the right separator given the user's platform
 */

export function joinEnvPaths(...paths: (undefined | string)[]) {
  const separator = process.platform === 'win32' ? ';' : ':';
  return paths.filter((path): path is string => !!path).join(separator);
}
