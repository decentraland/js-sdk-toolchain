import { createFsComponent } from '../../../packages/@dcl/sdk-commands/src/components/fs'
import { createDCLInfoConfigComponent } from '../../../packages/@dcl/sdk-commands/src/components/dcl-info-config'
import { removeEmptyKeys } from '../../../packages/@dcl/sdk-commands/src/logic/config'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('Dcl Info Config Component', () => {
  it('Upate dclinfo', async () => {
    const fsComponent = createFsComponent()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs: fsComponent })
    const file = { userId: 'boedo', otherProp: 1 }
    jest.spyOn(fsComponent, 'writeFile')
    jest.spyOn(fsComponent, 'readFile').mockImplementation(async (_file) => {
      return JSON.stringify(file)
    })
    const dclInfo = await dclInfoConfig.updateDCLInfo({ userId: 'casla' })
    expect(dclInfo).toMatchObject({ userId: 'casla', otherProp: 1 })
  })

  it('Upate dclinfo without previous one', async () => {
    const fsComponent = createFsComponent()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs: fsComponent })
    jest.spyOn(fsComponent, 'writeFile')
    jest.spyOn(fsComponent, 'readFile').mockImplementation(async (_file) => {
      throw 1
    })
    const dclInfo = await dclInfoConfig.updateDCLInfo({ userId: 'casla' })
    expect(dclInfo).toMatchObject({ userId: 'casla' })
  })

  it('dclinfo not found', async () => {
    const fsComponent = createFsComponent()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs: fsComponent })
    jest.spyOn(fsComponent, 'readFile').mockImplementation(async (_file) => {
      throw 1
    })
    const dclInfo = await dclInfoConfig.get()
    expect(dclInfo).toEqual({
      userId: '',
      trackStats: false,
      segmentKey: 'mjCV5Dc4VAKXLJAH5g7LyHyW1jrIR3to'
    })
  })

  it('Get sdk version', async () => {
    const fsComponent = createFsComponent()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs: fsComponent })
    expect(await dclInfoConfig.getVersion()).toBe('unknown')
  })

  it('removes empty keys', () => {
    expect(removeEmptyKeys({ boedo: 'casla', empty: undefined })).toEqual({ boedo: 'casla' })
  })

  it('get default config', async () => {
    const fsComponent = createFsComponent()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs: fsComponent })
    const dclInfo = await dclInfoConfig.get()
    expect(dclInfo).toEqual({
      userId: 'casla',
      trackStats: false,
      segmentKey: 'mjCV5Dc4VAKXLJAH5g7LyHyW1jrIR3to'
    })
  })

  it('get isProduction', async () => {
    const originalEnv = process.env
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production'
    }
    const fsComponent = createFsComponent()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs: fsComponent })
    const isDev = dclInfoConfig.isProduction()

    expect(isDev).toBe(true)
    process.env = originalEnv
    expect(dclInfoConfig.isProduction()).toBe(false)
  })
})
