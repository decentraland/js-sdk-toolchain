import extractZip from 'extract-zip'
import { resolve } from 'path'
import { IFileSystemComponent } from '../components/fs'
import { IFetchComponent } from '../components/fetch'
import { outputFile, readFile } from 'fs-extra'

/**
 * Check's if directory is empty
 * @param dir Directory to check for emptyness
 */
export async function isDirectoryEmpty(components: { fs: IFileSystemComponent }, dir: string): Promise<boolean> {
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
  await extractZip(resolve(path), { dir: destPath })
  return destPath
}

/**
 * Reads a file and parses it's JSON content
 * @param path The path to the subject json file
 */
export async function readJSON<T>(path: string): Promise<T> {
  const content = await readFile(path, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Merges the provided content with a json file
 * @param path The path to the subject json file
 * @param content The content to be applied (as a plain object)
 */
export async function writeJSON<T = unknown>(path: string, content: Partial<T>): Promise<Partial<T>> {
  let currentFile

  try {
    currentFile = await readJSON<T>(path)
  } catch (e) {
    currentFile = {}
  }

  const newJson = { ...currentFile, ...content }
  const strContent = JSON.stringify(newJson, null, 2)

  await outputFile(path, strContent)
  return newJson
}
