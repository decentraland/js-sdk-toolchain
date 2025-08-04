import { handle } from './handle';
import * as electron from './electron';
import * as updater from './updater';
import * as inspector from './inspector';
import * as cli from './cli';
import * as bin from './bin';
import * as analytics from './analytics';
import * as npm from './npm';

export function initIpc() {
  // electron
  handle('electron.getAppVersion', () => electron.getAppVersion());
  handle('electron.getUserDataPath', () => electron.getUserDataPath());
  handle('electron.getWorkspaceConfigPath', (_event, path) =>
    electron.getWorkspaceConfigPath(path),
  );
  handle('electron.showOpenDialog', (_event, opts) => electron.showOpenDialog(opts));
  handle('electron.openExternal', (_event, url) => electron.openExternal(url));
  handle('electron.copyToClipboard', (_event, text) => electron.copyToClipboard(text));

  // updater
  handle('updater.checkForUpdates', (_event, config) => updater.checkForUpdates(config));
  handle('updater.quitAndInstall', (_event, version) => updater.quitAndInstall(version));
  handle('updater.downloadUpdate', () => updater.downloadUpdate());
  handle('updater.setupUpdaterEvents', event => updater.setupUpdaterEvents(event));
  handle('updater.getInstalledVersion', () => updater.getInstalledVersion());
  handle('updater.deleteVersionFile', () => updater.deleteVersionFile());

  // inspector
  handle('inspector.start', () => inspector.start());
  handle('inspector.openSceneDebugger', (_event, path) => inspector.openSceneDebugger(path));
  handle('inspector.attachSceneDebugger', (_event, path, eventName) =>
    inspector.attachSceneDebugger(path, eventName),
  );

  // cli
  handle('cli.init', (_event, path, repo) => cli.init(path, repo));
  handle('cli.start', (_event, path, opts) => cli.start(path, opts));
  handle('cli.deploy', (_event, opts) => cli.deploy(opts));
  handle('cli.killPreview', (_event, path) => cli.killPreview(path));

  // bin
  handle('bin.install', () => bin.install());
  handle('bin.code', (_event, path) => bin.code(path));

  // analytics
  handle('analytics.track', (_event, eventName, data) => analytics.track(eventName, data!));
  handle('analytics.identify', (_event, userId, traits) => analytics.identify(userId, traits));
  handle('analytics.getAnonymousId', () => analytics.getAnonymousId());
  handle('analytics.getProjectId', (_event, path) => analytics.getProjectId(path));

  // npm
  handle('npm.install', (_event, path, packages) => npm.install(path, packages));
  handle('npm.getOutdatedDeps', (_event, path, packages) => npm.getOutdatedDeps(path, packages));
}
