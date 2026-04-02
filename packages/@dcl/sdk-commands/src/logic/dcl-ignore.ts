import path from 'path'
import { CliComponents } from '../components'

export const defaultDclIgnore = [
  '.*',
  'package.json',
  'package-lock.json',
  'yarn-lock.json',
  'build.json',
  'export',
  'tsconfig.json',
  'tslint.json',
  'node_modules',
  'dclcontext',
  '**/*.ts',
  '**/*.tsx',
  'Dockerfile',
  'thumbnails',
  'dist',
  'README.md',
  '*.blend',
  '*.fbx',
  '*.zip',
  '*.rar'
]

export async function getDCLIgnoreFileContents(
  components: Pick<CliComponents, 'fs'>,
  dir: string
): Promise<string | null> {
  try {
    return await components.fs.readFile(path.resolve(dir, '.dclignore'), 'utf8')
    //     ^^^^^ never remove that await.
  } catch (e) {}

  return null
}

/**
 * Returns the default .dclignore entries plus the ones provided by the user.
 * In case of .dclignore not existing, it returns a pre-defined list.
 */
export async function getDCLIgnorePatterns(components: Pick<CliComponents, 'fs'>, dir: string): Promise<string[]> {
  const ignoredContent = await getDCLIgnoreFileContents(components, dir)
  const ignored = (ignoredContent?.split('\n') || defaultDclIgnore).filter(Boolean)
  ignored.push(...defaultDclIgnore)

  // by default many files need to be ignored
  ignored.push('.*', 'node_modules', '**/*.ts', '**/*.tsx', 'node_modules/**', '*.md')

  return Array.from(new Set(ignored))
}

/**
 * Reads the .dclignore file, checks for missing entries, and appends them.
 * If the file does not exist, creates it with only the provided entries.
 */
export async function ensureDclIgnoreEntries(
  components: Pick<CliComponents, 'fs'>,
  dir: string,
  entries: string[]
): Promise<void> {
  const dclIgnorePath = path.resolve(dir, '.dclignore')
  const content = await getDCLIgnoreFileContents(components, dir)

  if (content === null) {
    // No .dclignore file — create one with the entries
    await components.fs.writeFile(dclIgnorePath, entries.join('\n') + '\n')
    return
  }

  const existingLines = new Set(content.split('\n').map((line) => line.trim()))
  const missingEntries = entries.filter((entry) => !existingLines.has(entry))

  if (missingEntries.length === 0) return

  const suffix = content.endsWith('\n') ? '' : '\n'
  await components.fs.appendFile(dclIgnorePath, suffix + missingEntries.join('\n') + '\n')
}
