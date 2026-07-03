import { Entity, YGPositionType } from '../../packages/@dcl/ecs/dist'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { resetInteractableArea, resetScreenInsetArea } from '../../packages/@dcl/react-ecs/src/components/utils'
import { setupEngine } from './utils'

describe('setUiRenderer area option', () => {
  afterEach(() => {
    resetScreenInsetArea()
    resetInteractableArea()
  })

  it('renders the ui unwrapped when area is omitted (default)', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number
    const contentEntity = (entityIndex + 1) as Entity

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />)
    await engine.update(1)

    expect(UiTransform.get(contentEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      width: 100
    })
    // No extra wrapper entity was created.
    expect(UiTransform.getOrNull((contentEntity + 1) as Entity)).toBeNull()

    uiRenderer.destroy()
  })

  it("renders the ui unwrapped when area is explicitly 'none'", async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number
    const contentEntity = (entityIndex + 1) as Entity

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, {
      virtualWidth: 1920,
      virtualHeight: 1080,
      area: 'none'
    })
    await engine.update(1)

    expect(UiTransform.get(contentEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      width: 100
    })
    expect(UiTransform.getOrNull((contentEntity + 1) as Entity)).toBeNull()

    uiRenderer.destroy()
  })

  it("wraps the ui in ScreenInsetArea when area is 'screen-inset'", async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiCanvasInformation = components.UiCanvasInformation(engine)
    const entityIndex = engine.addEntity() as number
    // The reconciler creates host entities bottom-up (children complete
    // before their parent), so the innermost content entity is created first.
    const contentEntity = (entityIndex + 1) as Entity
    const screenInsetEntity = (entityIndex + 2) as Entity

    UiCanvasInformation.create(engine.RootEntity, {
      devicePixelRatio: 1,
      width: 1920,
      height: 1080,
      interactableArea: undefined,
      screenInsetArea: { top: 24, left: 12, right: 16, bottom: 32 }
    })

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, {
      virtualWidth: 1920,
      virtualHeight: 1080,
      area: 'screen-inset'
    })
    await engine.update(1)

    // The outer entity is the ScreenInsetArea wrapper, absolutely positioned
    // using the renderer-reported screen inset area.
    expect(UiTransform.get(screenInsetEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      positionType: YGPositionType.YGPT_ABSOLUTE,
      positionTop: 24,
      positionLeft: 12,
      positionRight: 16,
      positionBottom: 32
    })

    // The user's ui is rendered as a child of the ScreenInsetArea wrapper.
    expect(UiTransform.get(contentEntity)).toMatchObject({
      parent: screenInsetEntity,
      width: 100
    })

    uiRenderer.destroy()
  })

  it("wraps the ui in ScreenInsetArea + InteractableArea when area is 'interactable'", async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiCanvasInformation = components.UiCanvasInformation(engine)
    const entityIndex = engine.addEntity() as number
    // Bottom-up creation order: innermost content first, then InteractableArea,
    // then the outermost ScreenInsetArea.
    const contentEntity = (entityIndex + 1) as Entity
    const interactableEntity = (entityIndex + 2) as Entity
    const screenInsetEntity = (entityIndex + 3) as Entity

    UiCanvasInformation.create(engine.RootEntity, {
      devicePixelRatio: 1,
      width: 1920,
      height: 1080,
      screenInsetArea: { top: 24, left: 12, right: 16, bottom: 32 },
      interactableArea: { top: 0, left: 480, right: 0, bottom: 0 }
    })

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, {
      virtualWidth: 1920,
      virtualHeight: 1080,
      area: 'interactable'
    })
    await engine.update(1)

    // Outermost: ScreenInsetArea, positioned using the screen inset area.
    expect(UiTransform.get(screenInsetEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      positionType: YGPositionType.YGPT_ABSOLUTE,
      positionTop: 24,
      positionLeft: 12,
      positionRight: 16,
      positionBottom: 32
    })

    // Inside it: InteractableArea, positioned using the interactable area.
    expect(UiTransform.get(interactableEntity)).toMatchObject({
      parent: screenInsetEntity,
      positionType: YGPositionType.YGPT_ABSOLUTE,
      positionTop: 0,
      positionLeft: 480,
      positionRight: 0,
      positionBottom: 0
    })

    // Innermost: the user's ui.
    expect(UiTransform.get(contentEntity)).toMatchObject({
      parent: interactableEntity,
      width: 100
    })

    uiRenderer.destroy()
  })

  it("applies the same wrapping for addUiRenderer's per-entity area option", async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiCanvasInformation = components.UiCanvasInformation(engine)
    const ownerEntity = engine.addEntity()
    const entityIndex = ownerEntity as number
    const contentEntity = (entityIndex + 1) as Entity
    const screenInsetEntity = (entityIndex + 2) as Entity

    UiCanvasInformation.create(engine.RootEntity, {
      devicePixelRatio: 1,
      width: 1920,
      height: 1080,
      interactableArea: undefined,
      screenInsetArea: { top: 10, left: 10, right: 10, bottom: 10 }
    })

    uiRenderer.addUiRenderer(ownerEntity, () => <UiEntity uiTransform={{ width: 50 }} />, {
      virtualWidth: 1920,
      virtualHeight: 1080,
      area: 'screen-inset'
    })
    await engine.update(1)

    expect(UiTransform.get(screenInsetEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      positionType: YGPositionType.YGPT_ABSOLUTE,
      positionTop: 10,
      positionLeft: 10,
      positionRight: 10,
      positionBottom: 10
    })
    expect(UiTransform.get(contentEntity)).toMatchObject({
      parent: screenInsetEntity,
      width: 50
    })

    uiRenderer.destroy()
  })
})
