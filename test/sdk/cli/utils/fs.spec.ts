jest.mock('fs/promises')
jest.mock('undici')
jest.mock('extract-zip')

import * as extractZip from 'extract-zip'
import * as undici from 'undici'
import * as fs from 'fs/promises'
import * as fsUtils from '../../../../packages/@dcl/sdk/cli/utils/fs'
import path from 'path'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('utils/fs', () => {
  it('createDirIfNotExists: should return early if path string is empty', async () => {
    const existsSpy = jest.spyOn(fsUtils, 'exists')

    await fsUtils.createDirIfNotExists('')

    expect(existsSpy).not.toBeCalled()
    expect(fs.mkdir).not.toBeCalled()
  })

  it('createDirIfNotExists: should return early if path already exists', async () => {
    const existsSpy = jest.spyOn(fsUtils, 'exists').mockResolvedValue(true)

    await fsUtils.createDirIfNotExists('some/path')

    expect(existsSpy).toBeCalledWith('some/path')
    expect(fs.mkdir).not.toBeCalled()
  })

  it('createDirIfNotExists: should create dir', async () => {
    const existsSpy = jest.spyOn(fsUtils, 'exists').mockResolvedValue(false)

    await fsUtils.createDirIfNotExists('some/path')

    expect(existsSpy).toBeCalledWith('some/path')
    expect(fs.mkdir).toBeCalledWith('some/path')
  })

  it('ensureFolder: should create single dir when path is not an array', async () => {
    const createDirSpy = jest.spyOn(fsUtils, 'createDirIfNotExists')
    const ensureSpy = jest.spyOn(fsUtils, 'ensureFolder')

    await fsUtils.ensureFolder('some/path')

    expect(createDirSpy).toBeCalledWith('some/path')
    expect(ensureSpy).toBeCalledTimes(1)
    expect(ensureSpy).toBeCalledWith('some/path')
  })

  it('ensureFolder: should create single dir when path array length is 1', async () => {
    const createDirSpy = jest.spyOn(fsUtils, 'createDirIfNotExists')
    const ensureSpy = jest.spyOn(fsUtils, 'ensureFolder')

    await fsUtils.ensureFolder(['some/path'])

    expect(createDirSpy).toBeCalledWith('some/path')
    expect(ensureSpy).toBeCalledTimes(1)
    expect(ensureSpy).toBeCalledWith(['some/path'])
  })

  it('ensureFolder: should create dir for the first path in array and repeat with rest of paths', async () => {
    const createDirSpy = jest.spyOn(fsUtils, 'createDirIfNotExists')
    const ensureSpy = jest.spyOn(fsUtils, 'ensureFolder')

    await fsUtils.ensureFolder(['some/path', 'some/other/path'])

    expect(ensureSpy).toBeCalledTimes(2)
    expect(createDirSpy).toBeCalledWith('some/path')
    expect(createDirSpy).toBeCalledWith('some/other/path')
    expect(ensureSpy).toBeCalledTimes(2)
    expect(ensureSpy).toBeCalledWith(['some/path', 'some/other/path'])
    expect(ensureSpy).toBeCalledWith(['some/other/path'])
  })

  it('isDirectory: should return early if path does not exist', async () => {
    const existsSpy = jest.spyOn(fsUtils, 'exists').mockResolvedValue(false)

    const res = await fsUtils.isDirectory('some/path')

    expect(res).toBe(false)
    expect(existsSpy).toBeCalledWith('some/path')
  })

  it('isDirectory: should return true if path is a directory', async () => {
    const existsSpy = jest.spyOn(fsUtils, 'exists').mockResolvedValue(true)
    const lstatSpy = jest.spyOn(fs, 'lstat').mockResolvedValue({
      isDirectory: () => true
    } as any)

    const res = await fsUtils.isDirectory('some/path')

    expect(res).toBe(true)
    expect(existsSpy).toBeCalledWith('some/path')
    expect(lstatSpy).toBeCalledWith('some/path')
  })

  it('isFile: should return early if path does not exist', async () => {
    const existsSpy = jest.spyOn(fsUtils, 'exists').mockResolvedValue(false)

    const res = await fsUtils.isFile('some/path')

    expect(res).toBe(false)
    expect(existsSpy).toBeCalledWith('some/path')
  })

  it('isFile: should return true if path is a file', async () => {
    const existsSpy = jest.spyOn(fsUtils, 'exists').mockResolvedValue(true)
    const lstatSpy = jest.spyOn(fs, 'lstat').mockResolvedValue({
      isFile: () => true
    } as any)

    const res = await fsUtils.isFile('some/path')

    expect(res).toBe(true)
    expect(existsSpy).toBeCalledWith('some/path')
    expect(lstatSpy).toBeCalledWith('some/path')
  })

  it('exists: should return true if path exist', async () => {
    const accessSpy = jest.spyOn(fs, 'access')

    const res = await fsUtils.exists(__filename)

    expect(res).toBe(true)
    expect(accessSpy).toBeCalledWith(__filename)
  })

  it('exists: should return false if path does not exist', async () => {
    const accessSpy = jest.spyOn(fs, 'access').mockRejectedValue(undefined)

    const res = await fsUtils.exists('some/path')

    expect(res).toBe(false)
    expect(accessSpy).toBeCalledWith('some/path')
  })

  it("download: should download a file and return it's destination", async () => {
    const fetchSpy = jest.spyOn(undici, 'fetch').mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(123)
    } as any as undici.Response)
    const writeFileSpy = jest.spyOn(fs, 'writeFile')

    const dist = await fsUtils.download('some/path', 'other/path')

    expect(dist).toBe('other/path')
    expect(fetchSpy).toBeCalledWith('some/path')
    expect(writeFileSpy).toBeCalledWith(
      'other/path',
      Buffer.from(new ArrayBuffer(123))
    )
  })

  it.skip("extract: should extract a zip file and return it's destination", async () => {
    const extractSpy = jest.spyOn(extractZip, 'default')

    const dist = await fsUtils.extract('some/path', './other/path')

    expect(dist).toBe(path.resolve('./other/path'))
    expect(extractSpy).toBeCalledWith('some/path', {
      dir: dist
    })
  })

  it('remove: should remove a file', async () => {
    await fsUtils.remove('some/path')

    expect(fs.rm).toBeCalledWith('some/path')
  })
})
