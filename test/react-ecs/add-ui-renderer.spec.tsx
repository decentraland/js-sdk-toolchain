import { Entity } from '../../packages/@dcl/ecs/src/engine'
import { components } from '../../packages/@dcl/ecs/src'
import { UiEntity, ReactEcs } from '../../packages/@dcl/react-ecs/src'
import { setupEngine } from './utils'

describe('addUiRenderer', () => {
  it('should allow adding multiple UI renderers dynamically', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // First UI renderer
    const ui1 = () => <UiEntity uiTransform={{ width: 100 }} />
    // Second UI renderer
    const ui2 = () => <UiEntity uiTransform={{ width: 200 }} />

    const entity1 = (entityIndex + 1) as Entity
    const entity2 = (entityIndex + 2) as Entity

    // Add first renderer
    uiRenderer.addUiRenderer('ui1', ui1)
    await engine.update(1)
    expect(UiTransform.getOrNull(entity1)?.width).toBe(100)

    // Add second renderer
    uiRenderer.addUiRenderer('ui2', ui2)
    await engine.update(1)
    expect(UiTransform.getOrNull(entity1)?.width).toBe(100)
    expect(UiTransform.getOrNull(entity2)?.width).toBe(200)

    // Remove first renderer
    uiRenderer.removeUiRenderer('ui1')
    await engine.update(1)
    expect(UiTransform.getOrNull(entity1)).toBe(null)
    expect(UiTransform.getOrNull(entity2)?.width).toBe(200)

    // Clean up
    uiRenderer.destroy()
  })

  it('should work alongside setUiRenderer', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Main UI renderer via setUiRenderer
    const mainUi = () => <UiEntity uiTransform={{ width: 50 }} />
    // Additional UI renderer via addUiRenderer
    const additionalUi = () => <UiEntity uiTransform={{ width: 150 }} />

    const mainEntity = (entityIndex + 1) as Entity
    const additionalEntity = (entityIndex + 2) as Entity

    // Set main renderer
    uiRenderer.setUiRenderer(mainUi)
    await engine.update(1)
    expect(UiTransform.getOrNull(mainEntity)?.width).toBe(50)

    // Add additional renderer
    uiRenderer.addUiRenderer('additional', additionalUi)
    await engine.update(1)
    expect(UiTransform.getOrNull(mainEntity)?.width).toBe(50)
    expect(UiTransform.getOrNull(additionalEntity)?.width).toBe(150)

    // Remove additional renderer, main should still work
    uiRenderer.removeUiRenderer('additional')
    await engine.update(1)
    expect(UiTransform.getOrNull(mainEntity)?.width).toBe(50)
    expect(UiTransform.getOrNull(additionalEntity)).toBe(null)

    // Clean up
    uiRenderer.destroy()
  })

  it('should replace existing renderer with the same key', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)

    const ui1 = () => <UiEntity uiTransform={{ width: 100 }} />
    const ui1Updated = () => <UiEntity uiTransform={{ width: 300 }} />

    // Add first version
    uiRenderer.addUiRenderer('myUi', ui1)
    await engine.update(1)

    // Get all entities with UiTransform and find the one we created
    let entities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(entities.length).toBe(1)
    expect(UiTransform.get(entities[0][0]).width).toBe(100)

    // Replace with updated version using the same key
    uiRenderer.addUiRenderer('myUi', ui1Updated)
    await engine.update(1)

    // Should still have exactly one entity, with updated width
    entities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(entities.length).toBe(1)
    expect(UiTransform.get(entities[0][0]).width).toBe(300)

    // Clean up
    uiRenderer.destroy()
  })

  it('should do nothing when removing non-existent key', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    const ui1 = () => <UiEntity uiTransform={{ width: 100 }} />
    const entity1 = (entityIndex + 1) as Entity

    uiRenderer.addUiRenderer('ui1', ui1)
    await engine.update(1)
    expect(UiTransform.getOrNull(entity1)?.width).toBe(100)

    // Remove non-existent key should not affect anything
    uiRenderer.removeUiRenderer('nonExistentKey')
    await engine.update(1)
    expect(UiTransform.getOrNull(entity1)?.width).toBe(100)

    // Clean up
    uiRenderer.destroy()
  })
})
