import path from 'path';
import fs from 'fs/promises';
import { app, BrowserWindow, clipboard, dialog, type OpenDialogOptions, shell } from 'electron';

export function getHome() {
  return app.getPath('home');
}

export function getUserDataPath() {
  return app.getPath('userData');
}

export function getAppHomeLegacy() {
  return path.join(getHome(), '.decentraland');
}

export async function getWorkspaceConfigPath(_path: string) {
  const editorHomePath = path.join(_path, '.editor');
  try {
    await fs.stat(_path);
  } catch (error) {
    await fs.mkdir(editorHomePath, { recursive: true });
  }
  return editorHomePath;
}

export async function showOpenDialog(opts: Partial<OpenDialogOptions>): Promise<string[]> {
  const window = BrowserWindow.getFocusedWindow();
  if (!window) return [];

  const { filePaths } = await dialog.showOpenDialog(window, opts);
  return filePaths;
}

export async function openExternal(url: string) {
  shell.openExternal(url);
}

export async function getAppVersion() {
  return app.getVersion();
}

export async function copyToClipboard(text: string) {
  clipboard.writeText(text);
}
