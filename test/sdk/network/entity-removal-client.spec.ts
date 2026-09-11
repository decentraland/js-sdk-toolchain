import { Engine, IEngine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import { createEntityRemovalClient, EntityRemovalResult } from '../../../packages/@dcl/sdk/network/entity-removal'
import { EntityRemovalRequest } from '../../../packages/@dcl/sdk/network/entity-removal-protocol'

describe('when the entity removal client receives server acceptance', () => {
  let engine: IEngine
  let entity: Entity
  let client: ReturnType<typeof createEntityRemovalClient>
  let send: jest.Mock<void, [EntityRemovalRequest]>
  let applyAccepted: jest.Mock<void, [EntityRemovalRequest]>
  let onResult: jest.Mock<void, [EntityRemovalResult]>
  let unsubscribe: () => void
  let request: EntityRemovalRequest

  beforeEach(() => {
    engine = Engine()
    entity = engine.addEntity()
    send = jest.fn<void, [EntityRemovalRequest]>()
    applyAccepted = jest.fn<void, [EntityRemovalRequest]>()
    onResult = jest.fn<void, [EntityRemovalResult]>()
    client = createEntityRemovalClient(engine, send, applyAccepted)
    unsubscribe = client.onEntityRemovalResult(onResult)
    client.request(entity, { networkId: 7, entityId: 100 as Entity })
    client.flush(false)
    request = send.mock.calls[0][0]
    client.receive({ ...request, status: 'accepted' })
  })

  afterEach(() => {
    unsubscribe()
    jest.resetAllMocks()
  })

  describe('and the accepted deletion has not been applied locally', () => {
    beforeEach(() => {
      client.update(0.1)
    })

    it('should wait for actual entity removal before notifying listeners', () => {
      expect(onResult).not.toHaveBeenCalled()
    })
  })

  describe('and the local deletion is subsequently applied', () => {
    beforeEach(async () => {
      client.update(0.1)
      engine.removeEntity(entity)
      await engine.update(0.1)
      client.update(0.1)
    })

    it('should emit the accepted outcome exactly once', () => {
      expect(onResult.mock.calls).toEqual([[{ entity, requestId: request.requestId, status: 'accepted' }]])
    })
  })
})
