import fs from 'fs/promises'
import extractZip from 'extract-zip'
import { fetch } from 'undici'

const _this = exports

/**
 * Create's a directory if not exists
 * @param path New directory path
 */
export async function createDirIfNotExists(path: string): Promise<void> {
  if (!path || (await _this.exists(path))) return
  await fs.mkdir(path)
}

/**
 * Checks if a folder exists and creates it if necessary.
 * @param path One or multiple paths to be checked.
 */
export async function ensureFolder(path: string | string[]): Promise<void> {
  if (!Array.isArray(path)) return _this.createDirIfNotExists(path)
  if (path.length <= 1) return _this.createDirIfNotExists(path[0])

  await _this.createDirIfNotExists(path[0])
  await _this.ensureFolder(path.slice(1))
}

/**
 * Check's if directory is empty
 * @param dir Directory to check for emptyness
 */
export async function isDirectoryEmpty(dir: string): Promise<boolean> {
  const files = await fs.readdir(dir)
  return !files.length
}

/**
 * Check's if path is a directory
 * @param path Path to some file/directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  return (await _this.exists(path)) && (await fs.lstat(path)).isDirectory()
}

/**
 * Check's if path is a file
 * @param path Path to some file/directory
 */
export async function isFile(path: string): Promise<boolean> {
  return (await _this.exists(path)) && (await fs.lstat(path)).isFile()
}

/**
 * Check's if directory exists
 * @param path Path to check for existence
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch (_) {
    return false
  }
}

/**
 * Download a file
 * @param url URL of the file
 * @param dest Path to where to save the file
 */
export async function download(url: string, dest: string): Promise<string> {
  // we should remove this package and use the native "fetch" when Node
  // releases it as stable: https://nodejs.org/docs/latest-v18.x/api/globals.html#fetch
  const data = await (await fetch(url)).arrayBuffer()
  await fs.writeFile(dest, Buffer.from(data))
  return dest
}

/**
 * Extracts a .zip file
 * @param url Path of the zip file
 * @param dest Path to where to extract the zip file
 */
export async function extract(path: string, dest: string): Promise<string> {
  await extractZip(path, { dir: dest })
  return dest
}

/**
 * Removes a file
 * @param url Path to the file to delete
 */
export async function remove(path: string): Promise<void> {
  await fs.rm(path)
}
