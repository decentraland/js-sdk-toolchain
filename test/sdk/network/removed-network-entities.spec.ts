jest.mock('~system/CommunicationsController', () => ({}), { virtual: true })
jest.mock('~system/UserIdentity', () => ({}), { virtual: true })
import { Engine, Entity } from '../../../packages/@dcl/ecs/src'
import * as components from '../../../packages/@dcl/ecs/src/components'
import { entityUtils } from '../../../packages/@dcl/sdk/src/network/entities'
import { engineToCrdt } from '../../../packages/@dcl/sdk/src/network/state'

const SYNC_ID = 7

function setup() {
  const engine = Engine()
  const Transform = components.Transform(engine as any)
  components.NetworkEntity(engine as any)
  components.NetworkParent(engine as any)
  components.SyncComponents(engine as any)
  const { syncEntity } = entityUtils(engine as any, { networkId: 42, userId: '0xabc' } as any)
  return { engine, Transform, syncEntity }
}

describe('when a synchronised entity is removed', () => {
  let engine: ReturnType<typeof setup>['engine']
  let syncEntity: ReturnType<typeof setup>['syncEntity']
  let Transform: ReturnType<typeof setup>['Transform']
  let removed: Entity

  beforeEach(async () => {
    const context = setup()
    engine = context.engine
    syncEntity = context.syncEntity
    Transform = context.Transform

    removed = engine.addEntity()
    Transform.create(removed)
    syncEntity(removed, [Transform.componentId], SYNC_ID)
    await engine.update(1)

    engine.removeEntity(removed)
    await engine.update(1)
    await engine.update(1)
  })

  it('should send nothing about it to a player joining later', () => {
    expect(engineToCrdt(engine as any)).toEqual([])
  })

  it('should let its sync id be used again', () => {
    const replacement = engine.addEntity()
    Transform.create(replacement)

    expect(() => syncEntity(replacement, [Transform.componentId], SYNC_ID)).not.toThrow()
  })
})

describe('when a synchronised entity is still alive', () => {
  let engine: ReturnType<typeof setup>['engine']
  let syncEntity: ReturnType<typeof setup>['syncEntity']

  beforeEach(async () => {
    const context = setup()
    engine = context.engine
    syncEntity = context.syncEntity

    const entity = engine.addEntity()
    context.Transform.create(entity)
    syncEntity(entity, [context.Transform.componentId], SYNC_ID)
    await engine.update(1)
  })

  it('should send its state to a player joining later', () => {
    expect(engineToCrdt(engine as any).length).toBeGreaterThan(0)
  })

  it('should still refuse to reuse its sync id', () => {
    const other = engine.addEntity()

    expect(() => syncEntity(other, [], SYNC_ID)).toThrow('already in use')
  })
})
