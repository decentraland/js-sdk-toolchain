/// <reference types="@types/node" />

import * as fs from 'fs'
import * as fsPromises from 'fs/promises'

/**
 * @public
 *
 * This may be moved to well-known-components in the future
 */
export type IFileSystemComponent = Pick<typeof fs, 'createReadStream'> &
  Pick<typeof fs, 'createWriteStream'> &
  Pick<
    typeof fsPromises,
    | 'access'
    | 'opendir'
    | 'stat'
    | 'unlink'
    | 'mkdir'
    | 'readFile'
    | 'writeFile'
    | 'rename'
    | 'rmdir'
    | 'appendFile'
    | 'rm'
  > & {
    constants: Pick<typeof fs.constants, 'F_OK' | 'R_OK'>
  } & {
    fileExists(path: string): Promise<boolean>
    directoryExists(path: string): Promise<boolean>
    readdir(path: string): Promise<string[]>
  }

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.promises.access(path, fs.constants.F_OK | fs.constants.R_OK)
    return true
  } catch (error) {
    return false
  }
}
async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await fs.promises.lstat(path)).isDirectory()
  } catch (error) {
    return false
  }
}

/**
 * @public
 */
export function createFsComponent(): IFileSystemComponent {
  return {
    createReadStream: fs.createReadStream,
    createWriteStream: fs.createWriteStream,
    access: fsPromises.access,
    appendFile: fsPromises.appendFile,
    writeFile: fsPromises.writeFile,
    opendir: fsPromises.opendir,
    stat: fsPromises.stat,
    unlink: fsPromises.unlink,
    mkdir: fsPromises.mkdir,
    rmdir: fsPromises.rmdir,
    rm: fsPromises.rm,
    readdir: fsPromises.readdir,
    readFile: fsPromises.readFile,
    constants: {
      F_OK: fs.constants.F_OK,
      R_OK: fs.constants.R_OK
    },
    rename: fsPromises.rename,
    fileExists,
    directoryExists
  }
}
