import { Entity, YGPositionType, YGUnit } from '../../packages/@dcl/ecs/dist'
import { components } from '../../packages/@dcl/ecs/src'
import { InteractableArea, ReactEcs } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { resetInteractableArea } from '../../packages/@dcl/react-ecs/src/components/utils'
import { setupEngine } from './utils'

describe('InteractableArea React Ecs', () => {
  afterEach(() => {
    resetInteractableArea()
  })

  it('positions itself absolutely using the renderer-reported interactable area', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiCanvasInformation = components.UiCanvasInformation(engine)
    const entityIndex = engine.addEntity() as number
    const rootDivEntity = (entityIndex + 1) as Entity

    UiCanvasInformation.create(engine.RootEntity, {
      devicePixelRatio: 1,
      width: 1920,
      height: 1080,
      interactableArea: { top: 24, left: 12, right: 16, bottom: 32 },
      screenInsetArea: undefined
    })

    uiRenderer.setUiRenderer(() => <InteractableArea />)
    await engine.update(1)

    expect(UiTransform.get(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      positionType: YGPositionType.YGPT_ABSOLUTE,
      positionTop: 24,
      positionLeft: 12,
      positionRight: 16,
      positionBottom: 32,
      positionTopUnit: YGUnit.YGU_POINT,
      positionLeftUnit: YGUnit.YGU_POINT,
      positionRightUnit: YGUnit.YGU_POINT,
      positionBottomUnit: YGUnit.YGU_POINT
    })

    uiRenderer.destroy()
  })

  it('updates its position when the interactable area changes', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiCanvasInformation = components.UiCanvasInformation(engine)
    const entityIndex = engine.addEntity() as number
    const rootDivEntity = (entityIndex + 1) as Entity

    UiCanvasInformation.create(engine.RootEntity, {
      devicePixelRatio: 1,
      width: 1920,
      height: 1080,
      interactableArea: { top: 0, left: 0, right: 0, bottom: 0 },
      screenInsetArea: undefined
    })

    uiRenderer.setUiRenderer(() => <InteractableArea />)
    await engine.update(1)

    expect(UiTransform.get(rootDivEntity)).toMatchObject({
      positionTop: 0,
      positionLeft: 0,
      positionRight: 0,
      positionBottom: 0
    })

    const next = UiCanvasInformation.getMutable(engine.RootEntity)
    next.interactableArea = { top: 50, left: 60, right: 70, bottom: 80 }
    await engine.update(1)

    expect(UiTransform.get(rootDivEntity)).toMatchObject({
      positionTop: 50,
      positionLeft: 60,
      positionRight: 70,
      positionBottom: 80
    })

    uiRenderer.destroy()
  })

  it('falls back to zero insets when UiCanvasInformation is not yet available', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number
    const rootDivEntity = (entityIndex + 1) as Entity

    uiRenderer.setUiRenderer(() => <InteractableArea />)
    await engine.update(1)

    expect(UiTransform.get(rootDivEntity)).toMatchObject({
      positionType: YGPositionType.YGPT_ABSOLUTE,
      positionTop: 0,
      positionLeft: 0,
      positionRight: 0,
      positionBottom: 0
    })

    uiRenderer.destroy()
  })

  it('forwards user uiTransform props but ignores positionType / position overrides', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiCanvasInformation = components.UiCanvasInformation(engine)
    const entityIndex = engine.addEntity() as number
    const rootDivEntity = (entityIndex + 1) as Entity

    UiCanvasInformation.create(engine.RootEntity, {
      devicePixelRatio: 1,
      width: 1920,
      height: 1080,
      interactableArea: { top: 10, left: 10, right: 10, bottom: 10 },
      screenInsetArea: undefined
    })

    uiRenderer.setUiRenderer(() => (
      <InteractableArea
        uiTransform={
          {
            // user-provided overrides for position* should be ignored by typing,
            // but we cast through `any` to assert runtime behaviour as well.
            positionType: 'relative',
            position: { top: 999, left: 999, right: 999, bottom: 999 },
            padding: 4
          } as any
        }
      />
    ))
    await engine.update(1)

    expect(UiTransform.get(rootDivEntity)).toMatchObject({
      positionType: YGPositionType.YGPT_ABSOLUTE,
      positionTop: 10,
      positionLeft: 10,
      positionRight: 10,
      positionBottom: 10
    })

    uiRenderer.destroy()
  })
})
