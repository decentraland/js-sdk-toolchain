import { ContentMapping } from '@dcl/schemas/dist/misc/content-mapping'
import { CliComponents } from '../components'
import { getDCLIgnorePatterns } from './dcl-ignore'
import { globSync, statSync, Dirent } from 'fs'
import ignore from 'ignore'
import i18next from 'i18next'
import os from 'os'

import path, { resolve } from 'path'
import { CliError } from './error'
import { concurrentMap } from './promise-utils'

export type ProjectFile = {
  absolutePath: string
  hash: string
}

/**
 * Returns an array of the publishable files for a given folder.
 *
 */
export async function getPublishableFiles(
  components: Pick<CliComponents, 'fs'>,
  projectRoot: string
): Promise<Array<string>> {
  const ignorePatterns = await getDCLIgnorePatterns(components, projectRoot)

  const ig = ignore().add(ignorePatterns)
  const allFiles = globSync('**/*', {
    cwd: projectRoot,
    // prune walking into trees ig.filter below always excludes anyway (perf only;
    // exclude receives a string on some Node versions and a Dirent on others)
    exclude: (entry: string | Dirent) => {
      const name = typeof entry === 'string' ? path.basename(entry) : entry.name
      return name.startsWith('.') || name === 'node_modules'
    }
  })

  return ig.filter(allFiles).filter((file) => statSync(resolve(projectRoot, file)).isFile())
}

/**
 * This function converts paths to decentraland-compatible paths.
 * - From windows separators to unix separators.
 * - All to lowercase
 */
export function normalizeDecentralandFilename(projectRoot: string, filename: string) {
  const newAbsolute = path.resolve(projectRoot, filename)
  const relativePath = path.relative(projectRoot, newAbsolute)
  // 1. win->unix style
  // 2. remove heading /
  return relativePath.replace(/(\\)/g, '/').replace(/^\/+/, '').toLowerCase()
}

/**
 * This function normalizes the content mappings of a project to be used by the
 * Decentraland file system
 */
export function projectFilesToContentMappings(projectRoot: string, files: ProjectFile[]): ContentMapping[] {
  return files.map((file) => {
    return {
      file: normalizeDecentralandFilename(projectRoot, file.absolutePath),
      hash: file.hash
    }
  })
}

/**
 * Returns the content mappings for a specific project folder.
 * NOTE: the result of this function IS NOT NORMALIZED. Paths sould be normalized
 * with normalizeDecentralandFilename before usage
 *
 * TODO: Unit test this function
 */
export async function getProjectPublishableFilesWithHashes(
  components: Pick<CliComponents, 'fs'>,
  projectRoot: string,
  hashingFunction: (filePath: string) => Promise<string>
): Promise<ProjectFile[]> {
  const projectFiles = await getPublishableFiles(components, projectRoot)
  const existingFiles = (
    await concurrentMap(projectFiles, async (file) => {
      const absolutePath = path.resolve(projectRoot, file)
      return (await components.fs.fileExists(absolutePath)) ? { file, absolutePath } : null
    })
  ).filter((file): file is { file: string; absolutePath: string } => file !== null)

  const usedFilenames = new Set<string>()
  for (const { file } of existingFiles) {
    const normalizedFile = normalizeDecentralandFilename(projectRoot, file)

    /* istanbul ignore if */
    if (usedFilenames.has(normalizedFile)) {
      throw new CliError('PROJECT_FILES_DUPLICATE_FILE', i18next.t('errors.project_files.duplicate_file', { file }))
    }

    usedFilenames.add(normalizedFile)
  }

  return concurrentMap(existingFiles, async ({ absolutePath }) => {
    return {
      absolutePath,
      hash: await hashingFunction(absolutePath)
    }
  })
}
export const machineId = os.hostname() || os.userInfo().username
export const b64HashingFunction = (str: string) => {
  const unique = `${str}-${machineId}`
  return 'b64-' + Buffer.from(unique).toString('base64')
}

// Content-versioned variant for preview file ids: embeds the file's mtime so the id — and any URL
// or client cache key derived from it — changes whenever the file changes, while staying decodable
// back to the path. NUL separates the path from the version; file paths cannot contain NUL bytes.
export const b64ContentVersionedHashingFunction = (str: string, mtimeMs: number) => {
  const unique = `${str}\u0000${Math.trunc(mtimeMs)}-${machineId}`
  return 'b64-' + Buffer.from(unique).toString('base64')
}

// Decodes a `b64-` preview id back to its absolute path, stripping the machineId suffix and, when
// present, the NUL-separated mtime version segment. Accepts both plain and content-versioned ids.
export const b64HashDecodingFunction = (hash: string) => {
  const decoded = Buffer.from(hash.replace(/^b64-/, ''), 'base64').toString('utf8')
  const withoutMachineId = decoded.slice(0, -(machineId.length + 1))
  const versionSeparator = withoutMachineId.indexOf('\u0000')
  return versionSeparator === -1 ? withoutMachineId : withoutMachineId.slice(0, versionSeparator)
}
// export const ipfsHashingFunction = async (str: string) => hashV1(Buffer.from(str, 'utf8'))

interface PackageJson {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

/* istanbul ignore next */
export async function getPackageJson(components: Pick<CliComponents, 'fs'>, projectRoot: string) {
  try {
    const packageJsonRaw = await components.fs.readFile(resolve(projectRoot, 'package.json'), 'utf8')
    const packageJson = JSON.parse(packageJsonRaw) as PackageJson
    return packageJson
  } catch (err: any) {
    throw new CliError(
      'PROJECT_FILES_INVALID_PACKAGE_JSON',
      i18next.t('errors.project_files.invalid_package_json', { error: err.message })
    )
  }
}
