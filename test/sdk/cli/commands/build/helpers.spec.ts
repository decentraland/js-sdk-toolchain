import * as projectValidation from '../../../../../packages/@dcl/sdk/cli/logic/project-validations'
import * as sceneValidation from '../../../../../packages/@dcl/sdk/cli/logic/scene-validations'
import { Scene } from '../../../../../packages/@dcl/sdk/node_modules/@dcl/schemas'
import * as execUtils from '../../../../../packages/@dcl/sdk/cli/logic/exec'
import { initComponents } from '../../../../../packages/@dcl/sdk/cli/components'
import path from 'path'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

const components = initComponents()

describe('build:helpers', () => {
  it('assertValidProjectFolder: validate e2e with virtual file system', async () => {
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

    expect(res).toEqual({ scene })
    expect(fileExists).toBeCalledWith(path.resolve('some/path/package.json'))
    expect(readFile).toBeCalledWith(path.resolve('some/path/scene.json'), 'utf8')
  })

  it('assertValidProjectFolder: should fail on unrecognized file', async () => {
    const fileExists = jest.spyOn(components.fs, 'fileExists').mockImplementation(async (_file) => {
      return _file.endsWith('package.json')
    })
    jest.spyOn(projectValidation, 'assertValidProjectFolder')
    jest.spyOn(sceneValidation, 'validateSceneJson').mockResolvedValue('123' as any)

    await expect(() => projectValidation.assertValidProjectFolder(components, 'some/path')).rejects.toThrow()

    expect(fileExists).toBeCalledWith(path.resolve('some/path/package.json'))
  })

  it("assertValidProjectFolder: should throw if package.json doesn't exist", async () => {
    const fileExists = jest.spyOn(components.fs, 'fileExists').mockResolvedValue(false)
    jest.spyOn(projectValidation, 'assertValidProjectFolder')

    await expect(() => projectValidation.assertValidProjectFolder(components, 'some/path')).rejects.toThrow()

    expect(fileExists).toBeCalledWith(path.resolve('some/path/package.json'))
  })

  it('validateSceneJson: should return true if "package.json" has valid structure', async () => {
    const structure: Scene = {
      main: 'test.js',
      scene: {
        base: '0,0',
        parcels: ['0,0']
      }
    }
    jest.spyOn(components.fs, 'readFile').mockResolvedValue(JSON.stringify(structure))
    const warn = jest.spyOn(components.logger, 'warn')

    const res = await sceneValidation.validateSceneJson(components, 'some/path')

    expect(res).toEqual(structure)
    expect(warn).not.toBeCalled()
  })

  it('validateSceneJson: should return false if "package.json" has invalid structure', async () => {
    const structure = { test: 1 }
    jest.spyOn(components.fs, 'readFile').mockResolvedValue(JSON.stringify(structure))

    await expect(() => sceneValidation.validateSceneJson(components, 'some/path')).rejects.toThrow(
      /Invalid scene.json file.+/
    )
  })

  it('needsDependencies: should return true if "node_modules" does not exist', async () => {
    jest.spyOn(components.fs, 'directoryExists').mockResolvedValue(false)

    const res = await projectValidation.needsDependencies(components, 'some/path')

    expect(res).toBe(true)
  })

  it('needsDependencies: should return true if "node_modules" is empty', async () => {
    jest.spyOn(components.fs, 'directoryExists').mockResolvedValue(true)
    jest.spyOn(components.fs, 'readdir').mockResolvedValue([])

    const res = await projectValidation.needsDependencies(components, 'some/path')

    expect(res).toBe(true)
  })

  it('needsDependencies: should return false if "node_modules" is valid', async () => {
    jest.spyOn(components.fs, 'directoryExists').mockResolvedValue(true)
    jest.spyOn(components.fs, 'readdir').mockResolvedValue(['some', 'files'])

    const res = await projectValidation.needsDependencies(components, 'some/path')

    expect(res).toBe(false)
  })

  it('installDependencies: should run dependencies installation', async () => {
    const execSpy = jest.spyOn(execUtils, 'exec').mockResolvedValue()

    await projectValidation.installDependencies(components, 'some/path')

    expect(execSpy).toBeCalledWith('some/path', 'npm', ['install'])
  })

  it('npmRun: should build pass on the process.env', async () => {
    const execSpy = jest.spyOn(execUtils, 'exec').mockResolvedValue()

    await projectValidation.npmRun('some/path', 'build', 'a')

    expect(execSpy).toBeCalledWith('some/path', 'npm', ['run', 'build', '--silent', '--', 'a'], {
      env: process.env
    })
  })
})
