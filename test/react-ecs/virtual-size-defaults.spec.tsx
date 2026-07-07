import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { getUiScaleFactor, resetUiScaleFactor } from '../../packages/@dcl/react-ecs/src/components/utils'
import { setIsMobileProvider } from '../../packages/@dcl/react-ecs/src/platform'
import { setupEngine } from './utils'

const ui = () => <UiEntity uiTransform={{ width: 100 }} />

function createCanvasInfo(engine: any, width: number, height: number) {
  const UiCanvasInformation = components.UiCanvasInformation(engine)
  UiCanvasInformation.create(engine.RootEntity, {
    devicePixelRatio: 1,
    width,
    height,
    interactableArea: { left: 0, right: 0, top: 0, bottom: 0 }
  })
}

function mobileOverrideLogs(logSpy: jest.SpyInstance) {
  return logSpy.mock.calls.filter((args) => String(args[0]).includes('Mobile platform detected'))
}

describe('Virtual screen size defaults', () => {
  afterEach(() => {
    setIsMobileProvider(() => false)
    resetUiScaleFactor()
  })

  it('should default to 1920x1080 on non-mobile when no virtual size is provided', async () => {
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 3840, 2160)

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    // scale = Math.min(3840/1920, 2160/1080) = 2
    expect(getUiScaleFactor()).toBe(2)

    uiRenderer.destroy()
  })

  it('should default to 1600x720 on mobile when no virtual size is provided', async () => {
    setIsMobileProvider(() => true)
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 3200, 1440)

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    // scale = Math.min(3200/1600, 1440/720) = 2
    expect(getUiScaleFactor()).toBe(2)

    uiRenderer.destroy()
  })

  it('should disable the virtual screen when the provided virtualWidth is invalid', async () => {
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 3840, 2160)

    uiRenderer.setUiRenderer(ui, { virtualWidth: 1920, virtualHeight: 1080 })
    await engine.update(1)
    expect(getUiScaleFactor()).toBe(2)

    // An explicitly invalid size disables UI scaling entirely (no default fallback)
    uiRenderer.setUiRenderer(ui, { virtualWidth: 0, virtualHeight: 1080 })
    await engine.update(1)
    expect(getUiScaleFactor()).toBe(1)

    uiRenderer.destroy()
  })

  it('should disable the virtual screen on mobile when the provided virtualHeight is invalid', async () => {
    setIsMobileProvider(() => true)
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 3200, 1440)

    uiRenderer.setUiRenderer(ui, { virtualWidth: 1920, virtualHeight: -1 })
    await engine.update(1)

    // No mobile default applied — scaling stays off
    expect(getUiScaleFactor()).toBe(1)

    uiRenderer.destroy()
  })

  it('should disable the virtual screen when the main size is invalid, even if an additional renderer has a valid one', async () => {
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 1600, 900)
    const ownerEntity = engine.addEntity()

    // Main renderer options win, and being invalid they disable UI scaling
    uiRenderer.setUiRenderer(ui, { virtualWidth: 0, virtualHeight: 0 })
    uiRenderer.addUiRenderer(ownerEntity, ui, { virtualWidth: 800, virtualHeight: 600 })
    await engine.update(1)

    expect(getUiScaleFactor()).toBe(1)

    uiRenderer.destroy()
  })

  it('should use the first additional renderer size when neither main nor earlier renderers have one', async () => {
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 1600, 900)
    const entity1 = engine.addEntity()
    const entity2 = engine.addEntity()

    uiRenderer.setUiRenderer(ui)
    uiRenderer.addUiRenderer(entity1, ui)
    uiRenderer.addUiRenderer(entity2, ui, { virtualWidth: 800, virtualHeight: 600 })
    await engine.update(1)

    // scale = Math.min(1600/800, 900/600) = 1.5
    expect(getUiScaleFactor()).toBeCloseTo(1.5)

    uiRenderer.destroy()
  })

  it('should release the scale factor when the last renderer is removed', async () => {
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 1600, 900)
    const ownerEntity = engine.addEntity()

    uiRenderer.addUiRenderer(ownerEntity, ui, { virtualWidth: 800, virtualHeight: 600 })
    await engine.update(1)
    expect(getUiScaleFactor()).toBeCloseTo(1.5)

    uiRenderer.removeUiRenderer(ownerEntity)
    await engine.update(1)
    expect(getUiScaleFactor()).toBe(1)

    uiRenderer.destroy()
  })
})

describe('Mobile 16:9 virtual screen override', () => {
  afterEach(() => {
    setIsMobileProvider(() => false)
    resetUiScaleFactor()
  })

  it('should override a 16:9 virtual size to 1600x720 on mobile and log it once', async () => {
    setIsMobileProvider(() => true)
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 3200, 1440)

    uiRenderer.setUiRenderer(ui, { virtualWidth: 1920, virtualHeight: 1080 })
    await engine.update(1)

    // Overridden to 1600x720 → scale = Math.min(3200/1600, 1440/720) = 2
    expect(getUiScaleFactor()).toBe(2)
    expect(mobileOverrideLogs(logSpy)).toHaveLength(1)
    expect(mobileOverrideLogs(logSpy)[0][0]).toContain('1920x1080')
    expect(mobileOverrideLogs(logSpy)[0][0]).toContain('1600x720')

    // Subsequent ticks must not repeat the log
    await engine.update(1)
    expect(mobileOverrideLogs(logSpy)).toHaveLength(1)

    // A different 16:9 size logs again
    uiRenderer.setUiRenderer(ui, { virtualWidth: 1280, virtualHeight: 720 })
    await engine.update(1)
    expect(getUiScaleFactor()).toBe(2)
    expect(mobileOverrideLogs(logSpy)).toHaveLength(2)

    logSpy.mockRestore()
    uiRenderer.destroy()
  })

  it('should respect a non-16:9 virtual size on mobile', async () => {
    setIsMobileProvider(() => true)
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 3200, 1440)

    uiRenderer.setUiRenderer(ui, { virtualWidth: 800, virtualHeight: 600 })
    await engine.update(1)

    // scale = Math.min(3200/800, 1440/600) = 2.4
    expect(getUiScaleFactor()).toBeCloseTo(2.4)

    uiRenderer.destroy()
  })

  it('should respect a 16:9 virtual size on non-mobile platforms', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 3840, 2160)

    uiRenderer.setUiRenderer(ui, { virtualWidth: 1280, virtualHeight: 720 })
    await engine.update(1)

    // scale = Math.min(3840/1280, 2160/720) = 3
    expect(getUiScaleFactor()).toBe(3)
    expect(mobileOverrideLogs(logSpy)).toHaveLength(0)

    logSpy.mockRestore()
    uiRenderer.destroy()
  })

  it('should apply the override when platform detection resolves to mobile after startup', async () => {
    // Platform detection is async: the first ticks run as non-mobile.
    let mobile = false
    setIsMobileProvider(() => mobile)
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, 3200, 1440)

    uiRenderer.setUiRenderer(ui, { virtualWidth: 1600, virtualHeight: 900 })
    await engine.update(1)

    // Non-mobile: provided 16:9 size respected → Math.min(3200/1600, 1440/900) = 1.6
    expect(getUiScaleFactor()).toBeCloseTo(1.6)

    mobile = true
    await engine.update(1)

    // Mobile: 16:9 overridden to 1600x720 → scale 2
    expect(getUiScaleFactor()).toBe(2)

    uiRenderer.destroy()
  })
})
