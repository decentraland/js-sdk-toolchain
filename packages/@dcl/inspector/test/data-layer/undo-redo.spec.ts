import { EntityType } from '@dcl/schemas'
import * as components from '@dcl/ecs/dist/components'

import { initTestEngine } from './utils'
import { Entity, IEngine } from '@dcl/ecs'

describe('[UNDO] Inspector<->DataLayer<->Babylon', () => {
  const context = initTestEngine({
    baseUrl: '/',
    entity: { content: [], metadata: {}, version: 'v3', type: EntityType.SCENE, timestamp: 1, pointers: ['0, 0'] },
    id: '123'
  })
  function getTransform(engine: IEngine) {
    const Transform = components.Transform(engine)
    return Transform
  }
  let cachedEntity: Entity

  it('initialize dataLayer composite and send it to inspector', async () => {
    const { dataLayerEngine } = context
    await dataLayerEngine.update(1)
    await context.updateInspector()
  })

  it('creates a new entity with a Transform component', async () => {
    const { inspectorEngine, dataLayerEngine } = context
    const Transform = getTransform(inspectorEngine)
    const entity = (cachedEntity = inspectorEngine.addEntity())
    Transform.create(entity, { position: { x: 8, y: 8, z: 8 } })

    await context.updateInspector()
    expect(getTransform(dataLayerEngine).get(entity).position).toMatchObject({ x: 8, y: 8, z: 8 })
    expect(getTransform(inspectorEngine).get(entity).position).toMatchObject({ x: 8, y: 8, z: 8 })
  })

  it('modifies the Transform component', async () => {
    const { inspectorEngine, dataLayerEngine } = context
    const Transform = getTransform(inspectorEngine)
    Transform.getMutable(cachedEntity).position.x = 9
    await context.updateInspector()
    expect(getTransform(dataLayerEngine).get(cachedEntity).position.x).toBe(9)
    expect(getTransform(inspectorEngine).get(cachedEntity).position.x).toBe(9)
  })

  it('undo the transform update (8 -> 9)', async () => {
    const { inspectorEngine, dataLayer } = context
    await dataLayer.undo({})
    await context.updateInspector()
    expect(getTransform(inspectorEngine).get(cachedEntity).position.x).toBe(8)
  })

  it('undo the create transform operation, so the transform now will be deleted', async () => {
    const { inspectorEngine, dataLayer } = context
    await dataLayer.undo({})
    await context.updateInspector()
    expect(getTransform(inspectorEngine).getOrNull(cachedEntity)).toBe(null)
  })

  it('redo and create the transform again', async () => {
    const { inspectorEngine, dataLayer } = context
    await dataLayer.redo({})
    await context.updateInspector()
    expect(getTransform(inspectorEngine).get(cachedEntity).position).toMatchObject({ x: 8, y: 8, z: 8 })
  })

  it('generates a new component', async () => {
    const { inspectorEngine } = context
    const entity = inspectorEngine.addEntity()
    getTransform(inspectorEngine).create(entity)
    await context.updateInspector()
  })

  it('should clean the redoList.', async () => {
    const { inspectorEngine, dataLayer } = context
    await dataLayer.redo({})
    await context.updateInspector()

    // Nothing done
    expect(getTransform(inspectorEngine).get(cachedEntity).position.x).toBe(8)
  })
})
