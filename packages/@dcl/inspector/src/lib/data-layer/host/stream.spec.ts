import { EntityType } from '@dcl/schemas'
import * as components from '@dcl/ecs/dist/components'
import { initTestEngine } from '../../../../test/data-layer/utils'
import { Entity } from '@dcl/ecs'

describe('Inspector<->DataLayer<->Babylon. [Stream]', () => {
  const context = initTestEngine({
    baseUrl: '/',
    entity: { content: [], metadata: {}, version: 'v3', type: EntityType.SCENE, timestamp: 1, pointers: ['0, 0'] },
    id: '123'
  })
  it('[Serialize engine] DataLayer -> Inspector', async () => {
    const { inspectorEngine, dataLayerEngine } = context
    await dataLayerEngine.update(1)
    await context.updateInspector()
    const Transform = components.Transform(inspectorEngine)
    const hardcodedEntity = 512 as Entity
    expect(Transform.get(hardcodedEntity).position).toMatchObject({ x: 8, y: 1, z: 8 })
  })
  it('[New entity & component] Inspector -> Babylon', async () => {
    const { inspectorEngine, dataLayerEngine, babylonEngine } = context
    const entity = inspectorEngine.addEntity()
    const Transform = components.Transform(inspectorEngine)
    Transform.create(entity)
    await context.updateInspector()

    expect(dataLayerEngine.getComponent(Transform.componentId).get(entity)).toBeDefined()
    expect(babylonEngine.getComponent(Transform.componentId).get(entity)).toBeDefined()
  })

  it('[New entity & component] Renderer -> Inspector', async () => {
    const { inspectorEngine, dataLayerEngine, babylonEngine } = context
    const Transform = components.Transform(inspectorEngine)
    const entity = babylonEngine.addEntity()
    components.Transform(babylonEngine).create(entity)

    await context.updateRenderer()

    expect(dataLayerEngine.getComponent(Transform.componentId).get(entity)).toBeDefined()
    expect(babylonEngine.getComponent(Transform.componentId).get(entity)).toBeDefined()
    expect(inspectorEngine.getComponent(Transform.componentId).get(entity)).toBeDefined()
  })
})
