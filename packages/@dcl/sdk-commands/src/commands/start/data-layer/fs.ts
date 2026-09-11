import { FileSystemInterface } from '@dcl/inspector'
import path from 'path'
import { CliComponents } from '../../../components'

/**
 * Convert paths to posix stlye
 * .i.e: scene\\assets\\main.composite -> scene/assets/main.composite
 */
export function pathToPosix(value: string): string {
  return value.replace(/\\/g, '/')
}

export function createFileSystemInterfaceFromFsComponent(
  { fs }: Pick<CliComponents, 'fs'>,
  projectWorkingDirectory: string = process.cwd()
): FileSystemInterface {
  const projectRoot = path.resolve(projectWorkingDirectory)
  const canonicalProjectRoot = fs.realpath(projectRoot)

  function assertContainedPath(rootPath: string, requestedPath: string, resolvedPath: string): void {
    const relativePath = path.relative(rootPath, resolvedPath)

    if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
      throw new Error(`Path is outside the project directory: ${requestedPath}`)
    }
  }

  async function resolveProjectPath(requestedPath: string): Promise<string> {
    const normalizedPath = requestedPath.replace(/[\\/]/g, path.sep)
    const resolvedPath = path.resolve(projectRoot, normalizedPath)
    assertContainedPath(projectRoot, requestedPath, resolvedPath)

    const missingSegments: string[] = []
    let existingPath = resolvedPath

    while (true) {
      try {
        const canonicalExistingPath = await fs.realpath(existingPath)
        const canonicalResolvedPath = path.join(canonicalExistingPath, ...missingSegments)
        assertContainedPath(await canonicalProjectRoot, requestedPath, canonicalResolvedPath)
        return canonicalResolvedPath
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || existingPath === path.dirname(existingPath)) {
          throw error
        }

        missingSegments.unshift(path.basename(existingPath))
        existingPath = path.dirname(existingPath)
      }
    }
  }

  return {
    dirname(value: string): string {
      return pathToPosix(path.dirname(value))
    },
    basename(value: string): string {
      return pathToPosix(path.basename(value))
    },
    join(...paths: string[]): string {
      return path.join(...paths)
    },
    async existFile(filePath: string): Promise<boolean> {
      return fs.fileExists(await resolveProjectPath(filePath))
    },
    async readFile(filePath: string): Promise<Buffer> {
      return fs.readFile(await resolveProjectPath(filePath))
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      const resolvedPath = await resolveProjectPath(filePath)
      const folder = path.dirname(resolvedPath)
      if (!(await fs.directoryExists(folder))) {
        await fs.mkdir(folder, { recursive: true })
      }
      await fs.writeFile(resolvedPath, content as Uint8Array)
    },
    async rm(filePath: string) {
      await fs.rm(await resolveProjectPath(filePath))
    },
    async rmdir(dirPath: string) {
      await fs.rm(await resolveProjectPath(dirPath), { recursive: true })
    },
    async readdir(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
      const resolvedPath = await resolveProjectPath(dirPath)

      const result = await fs.readdir(resolvedPath)
      return Promise.all(
        result.map(async (name) => ({
          name: pathToPosix(name),
          isDirectory: await fs.directoryExists(path.resolve(resolvedPath, name))
        }))
      )
    },
    cwd(): string {
      return pathToPosix(projectWorkingDirectory)
    },
    async stat(filePath: string): Promise<{ size: number }> {
      const stats = await fs.stat(await resolveProjectPath(filePath))
      return { size: Number(stats.size) }
    }
  }
}
