import * as prompt from '../../../../packages/@dcl/sdk/cli/utils/prompt'
import * as fsUtls from '../../../../packages/@dcl/sdk/cli/utils/fs'
import { main } from '../../../../packages/@dcl/sdk/cli/commands/init'

afterEach(() => {
  jest.clearAllMocks()
})

describe('init command', () => {
  it('should do nothing if directory is not empty and no bypass arg is provided nor prompt accepted', async () => {
    const confirmSpy = jest.spyOn(prompt, 'confirm').mockResolvedValue(false)
    const downloadSpy = jest.spyOn(fsUtls, 'download')
    const extractSpy = jest.spyOn(fsUtls, 'extract')

    await main({ args: { _: [] } })

    expect(confirmSpy).toBeCalled()
    expect(downloadSpy).not.toBeCalled()
    expect(extractSpy).not.toBeCalled()
  })

  it('should download & extract if directory is not empty and prompt is accepted', async () => {
    const confirmSpy = jest.spyOn(prompt, 'confirm').mockResolvedValueOnce(true)
    const downloadSpy = jest.spyOn(fsUtls, 'download').mockImplementation()
    const extractSpy = jest.spyOn(fsUtls, 'extract').mockImplementation()
    const removeSpy = jest.spyOn(fsUtls, 'remove').mockImplementation()

    await main({ args: { _: [] } })

    expect(confirmSpy).toBeCalled()
    expect(downloadSpy).toBeCalled()
    expect(extractSpy).toBeCalled()
    expect(removeSpy).toBeCalled()
  })

  it('should download & extract if directory is not empty and "--yes" arg is provided', async () => {
    const confirmSpy = jest.spyOn(prompt, 'confirm')
    const downloadSpy = jest.spyOn(fsUtls, 'download').mockImplementation()
    const extractSpy = jest.spyOn(fsUtls, 'extract').mockImplementation()
    const removeSpy = jest.spyOn(fsUtls, 'remove').mockImplementation()

    await main({ args: { _: [], '--yes': true } })

    expect(confirmSpy).not.toBeCalled()
    expect(downloadSpy).toBeCalled()
    expect(extractSpy).toBeCalled()
    expect(removeSpy).toBeCalled()
  })
})
