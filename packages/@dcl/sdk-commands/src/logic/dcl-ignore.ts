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
  '**/*.ts',
  '**/*.tsx',
  'Dockerfile',
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
  ignored.push('.*', 'node_modules', '**/*.ts', '**/*.tsx', 'node_modules/**')

  return Array.from(new Set(ignored))
}
