import { Entity } from '../../packages/@dcl/ecs/src/engine'
import { components, YGPositionType, YGUnit } from '../../packages/@dcl/ecs/src'
import { UiEntity, ReactEcs } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import {
  getUiScaleFactor,
  resetInteractableArea,
  resetScreenInsetArea,
  resetUiScaleFactor
} from '../../packages/@dcl/react-ecs/src/components/utils'
import { setupEngine } from './utils'

describe('UI renderer screenInset option', () => {
  afterEach(() => {
    resetUiScaleFactor()
    resetScreenInsetArea()
    resetInteractableArea()
  })

  function createCanvasInfo(
    engine: ReturnType<typeof setupEngine>['engine'],
    overrides: Partial<{
      width: number
      height: number
      screenInsetArea: { top: number; left: number; right: number; bottom: number }
      interactableArea: { top: number; left: number; right: number; bottom: number }
    }> = {}
  ) {
    const UiCanvasInformation = components.UiCanvasInformation(engine)
    UiCanvasInformation.create(engine.RootEntity, {
      devicePixelRatio: 1,
      width: overrides.width ?? 1920,
      height: overrides.height ?? 1080,
      interactableArea: overrides.interactableArea,
      screenInsetArea: overrides.screenInsetArea
    })
  }

  it('adds no wrapper entity by default and with an explicit none', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine, { screenInsetArea: { top: 24, left: 12, right: 16, bottom: 32 } })

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />)
    await engine.update(1)

    let uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).parent).toBe(CANVAS_ROOT_ENTITY)

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, { screenInset: 'none' })
    await engine.update(1)

    uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).parent).toBe(CANVAS_ROOT_ENTITY)

    uiRenderer.destroy()
  })

  it('wraps the main UI in the device screen inset area', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine, { screenInsetArea: { top: 24, left: 12, right: 16, bottom: 32 } })

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, { screenInset: 'device' })
    await engine.update(1)

    const uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(2)

    const wrapper = uiEntities.find(([, transform]) => transform.positionType === YGPositionType.YGPT_ABSOLUTE)!
    expect(wrapper).toBeDefined()
    expect(wrapper[1]).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      positionTop: 24,
      positionLeft: 12,
      positionRight: 16,
      positionBottom: 32,
      positionTopUnit: YGUnit.YGU_POINT,
      positionLeftUnit: YGUnit.YGU_POINT,
      positionRightUnit: YGUnit.YGU_POINT,
      positionBottomUnit: YGUnit.YGU_POINT
    })

    const child = uiEntities.find(([, transform]) => transform.width === 100)!
    expect(child).toBeDefined()
    expect(child[1].parent).toBe(wrapper[0])

    uiRenderer.destroy()
  })

  it('wraps the main UI in the interactable area', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine, { interactableArea: { top: 0, left: 480, right: 0, bottom: 0 } })

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, { screenInset: 'interactable' })
    await engine.update(1)

    const uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(2)

    const wrapper = uiEntities.find(([, transform]) => transform.positionType === YGPositionType.YGPT_ABSOLUTE)!
    expect(wrapper[1]).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      positionTop: 0,
      positionLeft: 480,
      positionRight: 0,
      positionBottom: 0
    })

    const child = uiEntities.find(([, transform]) => transform.width === 100)!
    expect(child[1].parent).toBe(wrapper[0])

    uiRenderer.destroy()
  })

  it('honors a different inset per renderer simultaneously', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine, {
      screenInsetArea: { top: 24, left: 12, right: 16, bottom: 32 },
      interactableArea: { top: 0, left: 480, right: 0, bottom: 0 }
    })
    const deviceEntity = engine.addEntity()
    const noneEntity = engine.addEntity()

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, { screenInset: 'interactable' })
    uiRenderer.addUiRenderer(deviceEntity, () => <UiEntity uiTransform={{ width: 200 }} />, { screenInset: 'device' })
    uiRenderer.addUiRenderer(noneEntity, () => <UiEntity uiTransform={{ width: 300 }} />)
    await engine.update(1)

    // 3 renderer children + 2 wrappers ('none' adds none).
    const uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(5)

    const childOf = (width: number) => uiEntities.find(([, transform]) => transform.width === width)![1]
    const parentTransform = (child: { parent: number }) => UiTransform.get(child.parent as Entity)

    // Main UI sits inside an interactable-area wrapper.
    expect(parentTransform(childOf(100))).toMatchObject({
      positionType: YGPositionType.YGPT_ABSOLUTE,
      positionLeft: 480,
      parent: CANVAS_ROOT_ENTITY
    })

    // Additional renderer with 'device' sits inside a screen-inset wrapper.
    expect(parentTransform(childOf(200))).toMatchObject({
      positionType: YGPositionType.YGPT_ABSOLUTE,
      positionTop: 24,
      positionLeft: 12,
      parent: CANVAS_ROOT_ENTITY
    })

    // Additional renderer without inset stays directly under the canvas root.
    expect(childOf(300).parent).toBe(CANVAS_ROOT_ENTITY)

    uiRenderer.destroy()
  })

  it('updates the wrapper when the inset area changes', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiCanvasInformation = components.UiCanvasInformation(engine)
    createCanvasInfo(engine, { screenInsetArea: { top: 0, left: 0, right: 0, bottom: 0 } })

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, { screenInset: 'device' })
    await engine.update(1)

    const wrapper = Array.from(engine.getEntitiesWith(UiTransform)).find(
      ([, transform]) => transform.positionType === YGPositionType.YGPT_ABSOLUTE
    )!
    expect(wrapper[1]).toMatchObject({ positionTop: 0, positionLeft: 0, positionRight: 0, positionBottom: 0 })

    UiCanvasInformation.getMutable(engine.RootEntity).screenInsetArea = { top: 50, left: 60, right: 70, bottom: 80 }
    await engine.update(1)

    expect(UiTransform.get(wrapper[0])).toMatchObject({
      positionTop: 50,
      positionLeft: 60,
      positionRight: 70,
      positionBottom: 80
    })

    uiRenderer.destroy()
  })

  it('keeps the wrapper in canvas pixels when the UI scale factor is not 1', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    // Canvas at 2x the default 1920x1080 virtual screen -> scale factor 2.
    createCanvasInfo(engine, {
      width: 3840,
      height: 2160,
      screenInsetArea: { top: 100, left: 200, right: 300, bottom: 400 }
    })

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, { screenInset: 'device' })
    await engine.update(1)

    expect(getUiScaleFactor()).toBeCloseTo(2)

    const uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    const wrapper = uiEntities.find(([, transform]) => transform.positionType === YGPositionType.YGPT_ABSOLUTE)!
    // The wrapper position must stay at the raw canvas-px insets: the values are
    // pre-divided by the scale factor so the px parser's multiplication cancels out.
    expect(wrapper[1]).toMatchObject({
      positionTop: 100,
      positionLeft: 200,
      positionRight: 300,
      positionBottom: 400
    })

    // Regular px values inside the renderer are still scaled by the factor.
    const child = uiEntities.find(([, transform]) => transform.width === 200)!
    expect(child).toBeDefined()
    expect(child[1].parent).toBe(wrapper[0])

    uiRenderer.destroy()
  })

  it('does not disable the default virtual screen when options only carry a screenInset', async () => {
    const { engine, uiRenderer } = setupEngine()
    createCanvasInfo(engine, { width: 3840, height: 2160, screenInsetArea: { top: 0, left: 0, right: 0, bottom: 0 } })

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, { screenInset: 'device' })
    await engine.update(1)

    // Platform default 1920x1080 still applies -> factor 2.
    expect(getUiScaleFactor()).toBeCloseTo(2)

    uiRenderer.destroy()
  })

  it('re-wraps and unwraps when the inset changes across setUiRenderer calls', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine, { screenInsetArea: { top: 24, left: 12, right: 16, bottom: 32 } })
    const ui = () => <UiEntity uiTransform={{ width: 100 }} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(Array.from(engine.getEntitiesWith(UiTransform)).length).toBe(1)

    uiRenderer.setUiRenderer(ui, { screenInset: 'device' })
    await engine.update(1)
    const uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(2)
    const wrapper = uiEntities.find(([, transform]) => transform.positionType === YGPositionType.YGPT_ABSOLUTE)!
    expect(wrapper[1]).toMatchObject({ positionTop: 24, positionLeft: 12 })

    uiRenderer.setUiRenderer(ui, { screenInset: 'none' })
    await engine.update(1)
    expect(Array.from(engine.getEntitiesWith(UiTransform)).length).toBe(1)

    uiRenderer.destroy()
  })
})
