import fs from 'fs/promises'
import extractZip from 'extract-zip'
import { resolve } from 'path'
import { IFileSystemComponent } from '../components/fs'
import { IFetchComponent } from '../components/fetch'

/**
 * Read's a directory files
 * @param dir Directory to read files from
 */
/* istanbul ignore next */
export async function readdir(dir: string): Promise<string[]> {
  return fs.readdir(dir)
}

/**
 * Read's a file contents
 * @param path File to read content from
 */
/* istanbul ignore next */
export async function readFile(path: string): Promise<string> {
  return fs.readFile(path, 'utf8')
}

/**
 * Check's if directory is empty
 * @param dir Directory to check for emptyness
 */
export async function isDirectoryEmpty(
  components: { fs: IFileSystemComponent },
  dir: string
): Promise<boolean> {
  const files = await components.fs.readdir(dir)
  return !files.length
}

/**
 * Download a file
 * @param url URL of the file
 * @param dest Path to where to save the file
 */
export async function download(
  components: { fs: IFileSystemComponent; fetch: IFetchComponent },
  url: string,
  dest: string
): Promise<string> {
  // we should remove this package and use the native "fetch" when Node
  // releases it as stable: https://nodejs.org/docs/latest-v18.x/api/globals.html#fetch
  const data = await (await components.fetch.fetch(url)).arrayBuffer()
  await components.fs.writeFile(dest, Buffer.from(data))
  return dest
}

/**
 * Extracts a .zip file
 * @param url Path of the zip file
 * @param dest Path to where to extract the zip file
 */
export async function extract(path: string, dest: string): Promise<string> {
  const destPath = resolve(dest)
  await extractZip(path, { dir: destPath })
  return destPath
}
