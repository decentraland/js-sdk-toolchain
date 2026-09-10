import { FileSystemInterface } from '@dcl/inspector'
import path from 'path'
import { CliComponents } from '../../../components'
import { EditorWriteTracker } from '../../../logic/editor-write-tracker'

/**
 * Convert paths to posix stlye
 * .i.e: scene\\assets\\main.composite -> scene/assets/main.composite
 */
export function pathToPosix(value: string): string {
  return value.replace(/\\/g, '/')
}

/**
 * Source the editor writes (e.g. UI Designer roots under `src/ui/`) changes the compiled
 * scene, so it must hot-reload exactly like a hand edit. Everything else the data layer
 * writes (composite, generated entity names, imported assets) is already reflected live.
 */
function isSceneSourceFile(projectWorkingDirectory: string, absolutePath: string): boolean {
  const relative = path.relative(projectWorkingDirectory, absolutePath)
  return relative === 'src' || relative.startsWith(`src${path.sep}`)
}

export function createFileSystemInterfaceFromFsComponent(
  { fs }: Pick<CliComponents, 'fs'>,
  projectWorkingDirectory: string = process.cwd(),
  writeTracker?: EditorWriteTracker
): FileSystemInterface {
  const markEditorWrite = (absolutePath: string) => {
    if (!isSceneSourceFile(projectWorkingDirectory, absolutePath)) writeTracker?.markEditorWrite(absolutePath)
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
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      return fs.fileExists(resolvedPath)
    },
    async readFile(filePath: string): Promise<Buffer> {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      return fs.readFile(resolvedPath)
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      const folder = path.dirname(resolvedPath)
      const missingFolders: string[] = []
      for (let dir = folder; !(await fs.directoryExists(dir)); dir = path.dirname(dir)) {
        if (dir === path.dirname(dir)) break
        missingFolders.push(dir)
      }
      if (missingFolders.length > 0) {
        // the watcher reports each new folder as its own event, so mark them too
        missingFolders.forEach(markEditorWrite)
        await fs.mkdir(folder, { recursive: true })
      }
      markEditorWrite(resolvedPath)
      await fs.writeFile(resolvedPath, content as Uint8Array)
    },
    async rm(filePath: string) {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      markEditorWrite(resolvedPath)
      await fs.rm(resolvedPath)
    },
    async rmdir(dirPath: string) {
      const resolvedPath = path.isAbsolute(dirPath) ? dirPath : path.resolve(projectWorkingDirectory, dirPath)
      markEditorWrite(resolvedPath)
      await fs.rm(resolvedPath, { recursive: true })
    },
    async readdir(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
      if (dirPath.indexOf('/../') !== -1) {
        throw new Error('The usage of /../ is not allowed')
      }

      const root = dirPath === '.' || dirPath === './' || dirPath === ''
      const resolvedPath = root ? projectWorkingDirectory : dirPath

      const result = await fs.readdir(resolvedPath)
      return Promise.all(
        result.map(async (name) => ({
          name: pathToPosix(name),
          isDirectory: await fs.directoryExists(path.resolve(dirPath, name))
        }))
      )
    },
    cwd(): string {
      return pathToPosix(projectWorkingDirectory)
    },
    async stat(filePath: string): Promise<{ size: number }> {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      const stats = await fs.stat(resolvedPath)
      return { size: Number(stats.size) }
    }
  }
}
