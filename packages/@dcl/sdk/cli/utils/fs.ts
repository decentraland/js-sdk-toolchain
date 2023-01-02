import fs from 'fs-extra'

/**
 * Create's a directory if not exists
 * @param path New directory path
 */
export async function createDirIfNotExists(path: string): Promise<void> {
  if (!path || (await fs.pathExists(path))) return
  await fs.mkdir(path)
}

/**
 * Checks if a folder exists and creates it if necessary.
 * @param path One or multiple paths to be checked.
 */
export async function ensureFolder(path: string | string[]): Promise<void> {
  if (!Array.isArray(path)) return createDirIfNotExists(path)
  if (path.length <= 1) return createDirIfNotExists(path[0] || '')

  await createDirIfNotExists(path[0])
  await ensureFolder(path.slice(1))
}

/**
 * Check's if directory is empty
 */
export async function isDirectoryEmpty(dir: string = '.'): Promise<boolean> {
  const files = await fs.readdir(dir)
  return !files.length
}
