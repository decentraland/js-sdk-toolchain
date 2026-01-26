import { Entity } from '../../packages/@dcl/ecs/src/engine'
import { components } from '../../packages/@dcl/ecs/src'
import { UiEntity, ReactEcs } from '../../packages/@dcl/react-ecs/src'
import { getUiScaleFactor, resetUiScaleFactor } from '../../packages/@dcl/react-ecs/src/components/utils'
import { setupEngine } from './utils'

describe('addUiRenderer', () => {
  afterEach(() => {
    resetUiScaleFactor()
  })

  it('should allow adding multiple UI renderers dynamically', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)

    // Create entities to associate with UI renderers
    const ownerEntity1 = engine.addEntity()
    const ownerEntity2 = engine.addEntity()

    // First UI renderer
    const ui1 = () => <UiEntity uiTransform={{ width: 100 }} />
    // Second UI renderer
    const ui2 = () => <UiEntity uiTransform={{ width: 200 }} />

    // Add first renderer
    uiRenderer.addUiRenderer(ownerEntity1, ui1)
    await engine.update(1)

    let uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).width).toBe(100)

    // Add second renderer
    uiRenderer.addUiRenderer(ownerEntity2, ui2)
    await engine.update(1)

    uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(2)

    // Remove first renderer
    uiRenderer.removeUiRenderer(ownerEntity1)
    await engine.update(1)

    uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).width).toBe(200)

    // Clean up
    uiRenderer.destroy()
  })

  it('should work alongside setUiRenderer', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)

    // Create entity to associate with additional UI renderer
    const additionalEntity = engine.addEntity()

    // Main UI renderer via setUiRenderer
    const mainUi = () => <UiEntity uiTransform={{ width: 50 }} />
    // Additional UI renderer via addUiRenderer
    const additionalUi = () => <UiEntity uiTransform={{ width: 150 }} />

    // Set main renderer
    uiRenderer.setUiRenderer(mainUi)
    await engine.update(1)

    let uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).width).toBe(50)

    // Add additional renderer
    uiRenderer.addUiRenderer(additionalEntity, additionalUi)
    await engine.update(1)

    uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(2)

    // Remove additional renderer, main should still work
    uiRenderer.removeUiRenderer(additionalEntity)
    await engine.update(1)

    uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).width).toBe(50)

    // Clean up
    uiRenderer.destroy()
  })

  it('should replace existing renderer when same entity is used', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)

    // Create entity to associate with UI renderer
    const ownerEntity = engine.addEntity()

    const ui1 = () => <UiEntity uiTransform={{ width: 100 }} />
    const ui1Updated = () => <UiEntity uiTransform={{ width: 300 }} />

    // Add first version
    uiRenderer.addUiRenderer(ownerEntity, ui1)
    await engine.update(1)

    let uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).width).toBe(100)

    // Replace with updated version using the same entity
    uiRenderer.addUiRenderer(ownerEntity, ui1Updated)
    await engine.update(1)

    // Should still have exactly one UI entity, with updated width
    uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).width).toBe(300)

    // Clean up
    uiRenderer.destroy()
  })

  it('should do nothing when removing non-tracked entity', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)

    // Create entities
    const ownerEntity = engine.addEntity()
    const unrelatedEntity = engine.addEntity()

    const ui1 = () => <UiEntity uiTransform={{ width: 100 }} />

    uiRenderer.addUiRenderer(ownerEntity, ui1)
    await engine.update(1)

    let uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).width).toBe(100)

    // Remove unrelated entity should not affect anything
    uiRenderer.removeUiRenderer(unrelatedEntity)
    await engine.update(1)

    uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)
    expect(UiTransform.get(uiEntities[0][0]).width).toBe(100)

    // Clean up
    uiRenderer.destroy()
  })

  it('should auto-cleanup UI when associated entity is removed from engine', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)

    // Create entity to associate with UI renderer (e.g., a smart item entity)
    const smartItemEntity = engine.addEntity()

    const ui1 = () => <UiEntity uiTransform={{ width: 100 }} />

    // Add UI renderer associated with the smart item entity
    uiRenderer.addUiRenderer(smartItemEntity, ui1)
    await engine.update(1)

    // UI should be rendered
    let uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(1)

    // Remove the smart item entity from the engine
    engine.removeEntity(smartItemEntity)
    // First update: entity removal is processed at the end of this cycle
    await engine.update(1)
    // Second update: UI system detects the removed entity and cleans up
    await engine.update(1)

    // UI should be automatically cleaned up
    uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(0)

    // Clean up
    uiRenderer.destroy()
  })

  it('should cleanup multiple UIs when their entities are removed', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)

    // Create multiple entities
    const entity1 = engine.addEntity()
    const entity2 = engine.addEntity()
    const entity3 = engine.addEntity()

    const ui1 = () => <UiEntity uiTransform={{ width: 100 }} />
    const ui2 = () => <UiEntity uiTransform={{ width: 200 }} />
    const ui3 = () => <UiEntity uiTransform={{ width: 300 }} />

    // Add all UI renderers
    uiRenderer.addUiRenderer(entity1, ui1)
    uiRenderer.addUiRenderer(entity2, ui2)
    uiRenderer.addUiRenderer(entity3, ui3)
    await engine.update(1)

    let uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(3)

    // Remove entity2 from the engine
    engine.removeEntity(entity2)
    await engine.update(1)
    await engine.update(1)

    // Only entity2's UI should be cleaned up
    uiEntities = Array.from(engine.getEntitiesWith(UiTransform))
    expect(uiEntities.length).toBe(2)

    // Clean up
    uiRenderer.destroy()
  })

  it('should apply virtual size from addUiRenderer when main UI has none', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiCanvasInformation = components.UiCanvasInformation(engine)
    const ownerEntity = engine.addEntity()

    UiCanvasInformation.create(engine.RootEntity, {
      devicePixelRatio: 1,
      width: 1600,
      height: 900,
      interactableArea: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }
    })

    const ui = () => <UiEntity uiTransform={{ width: 100 }} />
    uiRenderer.addUiRenderer(ownerEntity, ui, { virtualWidth: 800, virtualHeight: 600 })
    await engine.update(1)

    expect(getUiScaleFactor()).toBeCloseTo(1.5)

    uiRenderer.destroy()
  })
})
