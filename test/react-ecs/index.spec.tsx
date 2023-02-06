import { Entity } from '../../packages/@dcl/ecs/src/engine'
import { components } from '../../packages/@dcl/ecs/src'
import { UiEntity, ReactEcs } from '../../packages/@dcl/react-ecs/src'
import { setupEngine } from './utils'

describe('Render UI System', () => {
  it('should remove the ui and the entities', async () => {
    const { engine, uiRenderer } = setupEngine()
    const ui = () => <UiEntity uiTransform={{ width: 1 }} />
    const UiTransform = components.UiTransform(engine)
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
