import { ContentMapping } from '@dcl/schemas/dist/misc/content-mapping'
import { CliComponents } from '../components'
import { getDCLIgnorePatterns } from './dcl-ignore'
import { sync as globSync } from 'glob'
import ignore from 'ignore'
import path from 'path'
import { CliError } from './error'

/**
 * Returns an array of the publishable files for a given folder.
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
export function normalizeDecentralandFilename(filename: string) {
  return filename.replace(/(\\)/g, '/').toLowerCase()
}

/**
 * Returns the content mappings for a specific project folder.
 */
export async function getProjectContentMappings(
  components: Pick<CliComponents, 'fs'>,
  projectRoot: string,
  hashingFunction: (filePath: string) => Promise<string>
): Promise<ContentMapping[]> {
  const projectFiles = await getPublishableFiles(components, projectRoot)
  const ret: ContentMapping[] = []

  const usedFilenames = new Set<string>()

  for (const file of projectFiles) {
    const absolutePath = path.resolve(projectRoot, file)

    /* istanbul ignore if */
    if (!(await components.fs.fileExists(absolutePath))) continue

    // remove heading '/'
    const normalizedFile = normalizeDecentralandFilename(file).replace(/^\/+/, '')

    /* istanbul ignore if */
    if (usedFilenames.has(normalizedFile)) {
      throw new CliError(
        `DuplicatedFilenameError: the file ${file} exists with a different casing. Please manually remove one occurrence`
      )
    }

    ret.push({
      file: normalizedFile,
      hash: await hashingFunction(absolutePath)
    })
  }

  return ret
}
