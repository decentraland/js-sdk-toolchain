import {
  Engine,
  IEngine,
  Entity,
  createPointerEventSystem,
  createInputSystem
} from '../../packages/@dcl/ecs'
import { components, IEngine as IIEngine } from '../../packages/@dcl/ecs/src'
import {
  UiEntity,
  ReactEcs,
  ReactBasedUiSystem,
  createReactBasedUiSystem
} from '../../packages/@dcl/react-ecs/src'

describe('Render UI System', () => {
  let engine: IEngine
  let uiRenderer: ReactBasedUiSystem

  beforeEach(() => {
    engine = Engine()
    uiRenderer = createReactBasedUiSystem(
      engine,
      createPointerEventSystem(engine, createInputSystem(engine))
    )
  })

  it('should remove the ui and the entities', async () => {
    const ui = () => <UiEntity uiTransform={{ width: 1 }} />
    const UiTransform = components.UiTransform(engine as IIEngine)
    const entityIndex = engine.addEntity() as number
    const getUiTransform = (entity: Entity) => UiTransform.getOrNull(entity)
    const divEntity = (entityIndex + 1) as Entity

    // without uiRenderer , shouldn't throw an error
    await engine.update(1)

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(divEntity)?.width).toBe(1)

    uiRenderer.destroy()
    await engine.update(1)
    expect(getUiTransform(divEntity)).toBe(null)
  })
})
