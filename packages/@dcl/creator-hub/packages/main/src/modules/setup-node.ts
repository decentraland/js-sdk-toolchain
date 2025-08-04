import path from 'path';
import fs from 'fs';
import { platform } from 'os';
import { app } from 'electron';
import cmdShim from 'cmd-shim';
import log from 'electron-log/main';
import { getBinPath } from './path';

const APP_UNPACKED_PATH = path.join(
  app.getAppPath(),
  import.meta.env.DEV ? '.' : '../app.asar.unpacked',
);

function getNodeCmdPath() {
  return path.join(APP_UNPACKED_PATH, platform() === 'win32' ? 'node.cmd' : 'node');
}

function joinEnvPaths(...paths: string[]) {
  return paths.filter(Boolean).join(path.delimiter);
}

export function setupNodeBinary() {
  // Only run in production mode
  if (import.meta.env.DEV || import.meta.env.TEST) {
    return;
  }

  const nodeCmdPath = getNodeCmdPath();
  const nodeBinPath = process.execPath;
  const npmBinPath = getBinPath('npm', 'npm');

  try {
    // check if link exists
    const stat = fs.statSync(nodeCmdPath);
    // check if it is a symlink
    if (stat.isSymbolicLink()) {
      const link = fs.readlinkSync(nodeCmdPath);
      // check if link points to the right bin
      if (link === process.execPath) {
        // skip linking
        log.info('[Install] Node binaries already installed');
        return;
      }
    }
    // if not a symlink or points to wrong location, delete
    fs.rmSync(nodeCmdPath);
  } catch (error) {
    // if link is not found, continue installing
  }

  log.info(`[Install] Installing node bin linking from ${nodeCmdPath} to ${nodeBinPath}`);
  // on windows we use a cmd file
  if (platform() === 'win32') {
    cmdShim(
      nodeBinPath,
      // remove the .cmd part if present, since it will get added by cmdShim
      nodeCmdPath.endsWith('.cmd') ? nodeCmdPath.replace(/\.cmd$/, '') : nodeCmdPath,
    );
  } else {
    // otherwise we use a symlink
    fs.symlinkSync(nodeBinPath, nodeCmdPath);
  }

  // Update PATH environment variable
  process.env.PATH = joinEnvPaths(
    path.dirname(nodeCmdPath),
    path.dirname(npmBinPath),
    process.env.PATH || '',
  );

  if (platform() !== 'win32') {
    // on unix systems we need to install the path to the local bin folder for the Open in VSCode feature to work
    process.env.PATH = joinEnvPaths(process.env.PATH, '/usr/local/bin');
  }

  log.info('[Install] node command:', nodeCmdPath);
  log.info('[Install] node bin:', nodeBinPath);
  log.info('[Install] npm bin:', npmBinPath);
  log.info('[Install] $PATH', process.env.PATH);
}
