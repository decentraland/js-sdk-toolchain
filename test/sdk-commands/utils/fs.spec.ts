jest.mock('../../../packages/@dcl/sdk-commands/node_modules/extract-zip')
import * as extractZip from '../../../packages/@dcl/sdk-commands/node_modules/extract-zip'
import * as fsUtils from '../../../packages/@dcl/sdk-commands/src/logic/fs'
import { createFsComponent } from '../../../packages/@dcl/sdk-commands/src/components/fs'
import { createFetchComponent } from '../../../packages/@dcl/sdk-commands/src/components/fetch'
import path, { resolve } from 'path'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('utils/fs', () => {
  it("download: should download a file and return it's destination", async () => {
    const fs = createFsComponent()
    const fetch = createFetchComponent()

    const fetchSpy = jest.spyOn(fetch, 'fetch').mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(123)
    } as any)

    const writeFileSpy = jest.spyOn(fs, 'writeFile').mockImplementation()

    const dist = await fsUtils.download({ fs, fetch }, 'some/path', 'other/path')

    expect(dist).toBe('other/path')
    expect(fetchSpy).toBeCalledWith('some/path')
    expect(writeFileSpy).toBeCalledWith('other/path', Buffer.from(new ArrayBuffer(123)))
  })

  it('fileExists directoryExists', async () => {
    const fs = createFsComponent()
    expect(await fs.fileExists('package.json')).toBeTruthy()
    expect(await fs.directoryExists('node_modules')).toBeTruthy()
    expect(await fs.directoryExists('node_modulesASD')).toBeFalsy()
    expect(await fs.fileExists('noooooooooo.json')).toBeFalsy()
  })

  it("extract: should extract a zip file and return it's destination", async () => {
    const extractSpy = jest.spyOn(extractZip, 'default')

    const dist = await fsUtils.extract('some/path', './other/path')

    expect(dist).toBe(path.resolve('./other/path'))
    expect(extractSpy).toBeCalledWith(resolve('some/path'), {
      dir: resolve(dist)
    })
  })
})
