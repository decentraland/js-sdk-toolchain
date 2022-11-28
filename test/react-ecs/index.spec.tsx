import {
  Engine,
  IEngine,
  Entity,
  components,
  createPointerEventSystem,
  createInputSystem
} from '../../packages/@dcl/ecs/src'
import {
  UiEntity,
  ReactEcs,
  ReactBasedUiSystem,
  createReactBasedUiSystem
} from '../../packages/@dcl/react-ecs'

describe('Render UI System', () => {
  let engine: IEngine
  let uiRenderer: ReactBasedUiSystem

  beforeEach(() => {
    engine = Engine()
    uiRenderer = createReactBasedUiSystem(
      engine as any,
      createPointerEventSystem(engine, createInputSystem(engine)) as any
    )
  })

  it('should remove the ui and the entities', () => {
    const ui = () => <UiEntity uiTransform={{ width: 1 }} />
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number
    const getUiTransform = (entity: Entity) => UiTransform.getOrNull(entity)
    const divEntity = (entityIndex + 1) as Entity

    // without uiRenderer , shouldn't throw an error
    engine.update(1)

    uiRenderer.setUiRenderer(ui)
    engine.update(1)
    expect(getUiTransform(divEntity)?.width).toBe(1)

    uiRenderer.destroy()
    engine.update(1)
    expect(getUiTransform(divEntity)).toBe(null)
  })
})
