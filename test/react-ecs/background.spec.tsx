import { Engine, IEngine, Entity, createPointerEventSystem, createInputSystem, PBUiBackground, components } from '../../packages/@dcl/ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'
import {
  ReactEcs,
  UiEntity,
  createReactBasedUiSystem,
  ReactBasedUiSystem,
  CANVAS_ROOT_ENTITY
} from '../../packages/@dcl/react-ecs/src'

describe('UiBackground React Ecs', () => {
  let engine: IEngine
  let uiRenderer: ReactBasedUiSystem

  beforeEach(() => {
    engine = Engine()
    uiRenderer = createReactBasedUiSystem(engine as any, createPointerEventSystem(engine, createInputSystem(engine)) as any)
  })

  it('should generate a UI and update the width of a div', async () => {
    const UiTransform=components.UiTransform(engine)
    const UiBackground=components.UiBackground(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const getBackground = (entity: Entity) => UiBackground.get(entity)
    let backgroundColor: Color4.Mutable | undefined = { r: 0, g: 1, b: 2, a: 0 }

    const ui = () => (
      <UiEntity
        uiTransform={{ width: 100 }}
        uiBackground={{ backgroundColor }}
      />
    )

    uiRenderer.setUiRenderer(ui)
    engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 100
    })

    expect(getBackground(rootDivEntity)).toMatchObject({
      backgroundColor: { r: 0, g: 1, b: 2, a: 0 }
    })

    // Update values
    backgroundColor.g = 20.8

    engine.update(1)
    expect(getBackground(rootDivEntity)).toMatchObject({
      backgroundColor: { r: 0, g: 20.8, b: 2 }
    })

    backgroundColor = undefined
    engine.update(1)
    expect(getBackground(rootDivEntity)).toMatchObject({
      backgroundColor: undefined
    })
  })

  it('should remove backgrund component', () => {
    const UiBackground=components.UiBackground(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getBackground = () => UiBackground.getOrNull(rootDivEntity)
    let backgroundProps: { uiBackground: PBUiBackground } | undefined = {
      uiBackground: { backgroundColor: { r: 0, g: 1, b: 2, a: 0 } }
    }

    const ui = () => (
      <UiEntity uiTransform={{ width: 100 }} {...backgroundProps} />
    )

    uiRenderer.setUiRenderer(ui)
    engine.update(1)
    expect(getBackground()?.backgroundColor).toMatchObject(
      backgroundProps.uiBackground.backgroundColor!
    )

    backgroundProps = undefined
    engine.update(1)
    expect(getBackground()).toBe(null)
  })
})
