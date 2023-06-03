import * as projectValidation from '../../../packages/@dcl/sdk-commands/src/logic/project-validations'
import * as sceneValidation from '../../../packages/@dcl/sdk-commands/src/logic/scene-validations'
import { Scene } from '../../../packages/@dcl/sdk-commands/node_modules/@dcl/schemas/dist'
import { initComponents } from '../../../packages/@dcl/sdk-commands/src/components'
import path from 'path'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('build:helpers', () => {
  it('assertValidProjectFolder: validate e2e with virtual file system', async () => {
    const components = await initComponents()
    const scene: Scene = {
      main: 'test.js',
      scene: {
        base: '0,0',
        parcels: ['0,0']
      }
    }

    const fs = {
      [path.resolve('some/path/package.json')]: '{}',
      [path.resolve('some/path/scene.json')]: JSON.stringify(scene)
    }

    const fileExists = jest.spyOn(components.fs, 'fileExists').mockImplementation(async (_file) => {
      return _file in fs
    })
    const readFile = jest.spyOn(components.fs, 'readFile').mockImplementation(async (_file) => {
      return fs[_file as any]
    })
    jest.spyOn(projectValidation, 'assertValidProjectFolder')

    const res = await projectValidation.assertValidProjectFolder(components, 'some/path')

    expect(res).toEqual({ kind: 'scene', scene, workingDirectory: 'some/path' })
    expect(fileExists).toBeCalledWith(path.resolve('some/path/package.json'))
    expect(readFile).toBeCalledWith(path.resolve('some/path/scene.json'), 'utf8')
  })

  it('assertValidProjectFolder: should fail on unrecognized file', async () => {
    const components = await initComponents()
    const fileExists = jest.spyOn(components.fs, 'fileExists').mockImplementation(async (_file) => {
      return _file.endsWith('package.json')
    })
    jest.spyOn(projectValidation, 'assertValidProjectFolder')
    jest.spyOn(sceneValidation, 'assertValidScene')

    await expect(() => projectValidation.assertValidProjectFolder(components, 'some/path')).rejects.toThrow()

    expect(fileExists).toBeCalledWith(path.resolve('some/path/package.json'))
  })

  it("assertValidProjectFolder: should throw if package.json doesn't exist", async () => {
    const components = await initComponents()
    const fileExists = jest.spyOn(components.fs, 'fileExists').mockResolvedValue(false)
    jest.spyOn(projectValidation, 'assertValidProjectFolder')

    await expect(() => projectValidation.assertValidProjectFolder(components, 'some/path')).rejects.toThrow()

    expect(fileExists).toBeCalledWith(path.resolve('some/path/package.json'))
  })

  it('needsDependencies: should return true if "node_modules" does not exist', async () => {
    const components = await initComponents()
    jest.spyOn(components.fs, 'directoryExists').mockResolvedValue(false)

    const res = await projectValidation.needsDependencies(components, 'some/path')

    expect(res).toBe(true)
  })

  it('needsDependencies: should return true if "node_modules" is empty', async () => {
    const components = await initComponents()
    jest.spyOn(components.fs, 'directoryExists').mockResolvedValue(true)
    jest.spyOn(components.fs, 'readdir').mockResolvedValue([])

    const res = await projectValidation.needsDependencies(components, 'some/path')

    expect(res).toBe(true)
  })

  it('needsDependencies: should return false if "node_modules" is valid', async () => {
    const components = await initComponents()
    jest.spyOn(components.fs, 'directoryExists').mockResolvedValue(true)
    jest.spyOn(components.fs, 'readdir').mockResolvedValue(['some', 'files'])

    const res = await projectValidation.needsDependencies(components, 'some/path')

    expect(res).toBe(false)
  })

  it('installDependencies: should run dependencies installation', async () => {
    const components = await initComponents()
    const execSpy = jest.spyOn(components.spawner, 'exec').mockResolvedValue()

    await projectValidation.installDependencies(components, 'some/path')

    expect(execSpy).toBeCalledWith('some/path', 'npm', ['install'])
  })

  it('npmRun: should build pass on the process.env', async () => {
    const components = await initComponents()
    const execSpy = jest.spyOn(components.spawner, 'exec').mockResolvedValue()

    await projectValidation.npmRun(components, 'some/path', 'build', 'a')

    expect(execSpy).toBeCalledWith('some/path', 'npm', ['run', 'build', '--silent', '--', 'a'], {
      env: process.env
    })
  })

  it('npmCommand: should build pass on the process.env', async () => {
    const components = await initComponents()
    const execSpy = jest.spyOn(components.spawner, 'exec').mockResolvedValue()

    await projectValidation.npmCommand(components, 'some/path', 'install', 'boedo')

    expect(execSpy).toBeCalledWith('some/path', 'npm', ['install', 'boedo', '--silent'], {
      env: process.env
    })
  })
})
