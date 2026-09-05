import { mkdtemp, rm, symlink } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { createFileSystemInterfaceFromFsComponent } from '../../../packages/@dcl/sdk-commands/src/commands/start/data-layer/fs'
import { createFsComponent, IFileSystemComponent } from '../../../packages/@dcl/sdk-commands/src/components/fs'

describe('createFileSystemInterfaceFromFsComponent', () => {
  let fs: IFileSystemComponent
  let fsInterface: ReturnType<typeof createFileSystemInterfaceFromFsComponent>
  let projectDirectory: string
  let outsideFile: string

  beforeEach(async () => {
    projectDirectory = await mkdtemp(path.join(tmpdir(), 'dcl-data-layer-'))
    outsideFile = path.resolve(projectDirectory, '..', 'outside.txt')
    fs = createFsComponent()
    fsInterface = createFileSystemInterfaceFromFsComponent({ fs }, projectDirectory)
  })

  afterEach(async () => {
    await rm(projectDirectory, { recursive: true, force: true })
  })

  describe('when a relative path escapes the project directory', () => {
    it('should reject file reads outside the project directory', async () => {
      await expect(fsInterface.readFile('../outside.txt')).rejects.toThrow('Path is outside the project directory')
    })
  })

  describe('when an absolute path is outside the project directory', () => {
    it('should reject file writes outside the project directory', async () => {
      await expect(fsInterface.writeFile(outsideFile, Buffer.from('unsafe'))).rejects.toThrow(
        'Path is outside the project directory'
      )
    })
  })

  describe('when a path uses Windows separators to escape the project directory', () => {
    it('should reject directory removal outside the project directory', async () => {
      await expect(fsInterface.rmdir('..\\outside')).rejects.toThrow('Path is outside the project directory')
    })
  })

  describe('when a project symlink points outside the project directory', () => {
    beforeEach(async () => {
      await symlink(path.dirname(outsideFile), path.join(projectDirectory, 'outside-link'))
    })

    it('should reject file reads through the symlink', async () => {
      await expect(fsInterface.readFile('outside-link/outside.txt')).rejects.toThrow(
        'Path is outside the project directory'
      )
    })
  })

  describe('when a relative directory is inside a non-default project directory', () => {
    let canonicalProjectDirectory: string
    let readdir: jest.SpyInstance

    beforeEach(async () => {
      canonicalProjectDirectory = await fs.realpath(projectDirectory)
      readdir = jest.spyOn(fs, 'readdir').mockResolvedValueOnce([])
    })

    afterEach(() => {
      readdir.mockRestore()
    })

    it('should resolve directory reads from the configured project directory', async () => {
      await fsInterface.readdir('assets')

      expect(readdir).toHaveBeenCalledWith(path.join(canonicalProjectDirectory, 'assets'))
    })
  })
})
