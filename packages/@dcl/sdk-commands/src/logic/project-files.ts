import { ContentMapping } from '@dcl/schemas/dist/misc/content-mapping'
import { CliComponents } from '../components'
import { getDCLIgnorePatterns } from './dcl-ignore'
import { sync as globSync } from 'glob'
import ignore from 'ignore'
import path, { resolve } from 'path'
import { CliError } from './error'

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
    absolute: false,
    dot: false,
    ignore: ignorePatterns,
    nodir: true
  })

  return ig.filter(allFiles)
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
  const ret: ProjectFile[] = []

  const usedFilenames = new Set<string>()

  for (const file of projectFiles) {
    const absolutePath = path.resolve(projectRoot, file)

    /* istanbul ignore if */
    if (!(await components.fs.fileExists(absolutePath))) continue

    const normalizedFile = normalizeDecentralandFilename(projectRoot, file)

    /* istanbul ignore if */
    if (usedFilenames.has(normalizedFile)) {
      throw new CliError(
        `DuplicatedFilenameError: the file ${file} exists with a different casing. Please manually remove one occurrence`
      )
    }

    usedFilenames.add(normalizedFile)

    ret.push({
      absolutePath,
      hash: await hashingFunction(absolutePath)
    })
  }

  return ret
}

export const b64HashingFunction = (str: string) => 'b64-' + Buffer.from(str).toString('base64')
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
    throw new CliError(`Error reading the package.json file: ${err.message}`)
  }
}
