import { Engine, IEngine, Entity } from '../../../../packages/@dcl/ecs/src/engine'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { createServerValidator } from '../../../../packages/@dcl/sdk/src/network/server'
import { BinaryMessageBus, CommsMessage } from '../../../../packages/@dcl/sdk/src/network/binary-message-bus'
import {
  EntityRemovalRequest,
  EntityRemovalResponse,
  decodeEntityRemovalResponse
} from '../../../../packages/@dcl/sdk/src/network/entity-removal-protocol'
import { Transport } from '../../../../packages/@dcl/ecs/src/systems/crdt/types'

describe('when the server receives an entity removal request', () => {
  let engine: IEngine
  let validator: ReturnType<typeof createServerValidator>
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let entity: Entity
  let request: EntityRemovalRequest
  let validateDeletion: jest.Mock<boolean, []>
  let emitted: { type: CommsMessage; data: Uint8Array; recipients?: string[] }[]
  let binaryMessageBus: ReturnType<typeof BinaryMessageBus>
  let transport: Transport
  let regularBytes: Uint8Array

  function responses(): EntityRemovalResponse[] {
    return emitted
      .filter((message) => message.type === CommsMessage.ENTITY_REMOVAL_RESULT)
      .map((message) => decodeEntityRemovalResponse(message.data)!)
  }

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    entity = engine.addEntity()
    Transform.create(entity)
    NetworkEntity.create(entity, { networkId: 7, entityId: 900 as Entity })
    request = { sessionIdHigh: 1, sessionIdLow: 2, requestId: 1, networkId: 7, entityId: 900 as Entity }
    validateDeletion = jest.fn<boolean, []>().mockReturnValue(true)
    Transform.validateBeforeChange(() => validateDeletion())
    emitted = []
    binaryMessageBus = {
      emit: (type: CommsMessage, data: Uint8Array, recipients?: string[]) => {
        emitted.push({ type, data, recipients })
      }
    } as ReturnType<typeof BinaryMessageBus>
    validator = createServerValidator({ engine, binaryMessageBus })
    transport = { filter: () => false, send: async () => {} }
    engine.addTransport(transport)
    regularBytes = new Uint8Array()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and the component permits removal', () => {
    beforeEach(() => {
      regularBytes = validator.processEntityRemovalRequest(request, 'requester')
    })

    it('should return a correlated acceptance to the requester', () => {
      expect(responses()).toEqual([{ ...request, status: 'accepted' }])
      expect(emitted.find((message) => message.type === CommsMessage.ENTITY_REMOVAL_RESULT)?.recipients).toEqual([
        'requester'
      ])
    })

    it('should broadcast the accepted entity deletion once', () => {
      expect(emitted.filter((message) => message.type === CommsMessage.CRDT)).toHaveLength(1)
    })

    describe('and the engine applies the returned CRDT', () => {
      beforeEach(async () => {
        transport.onmessage!(regularBytes)
        await engine.update(0.1)
      })

      it('should remove the entity state', () => {
        expect(Transform.has(entity)).toBe(false)
      })
    })

    describe('and the requester retransmits the request', () => {
      beforeEach(() => {
        regularBytes = validator.processEntityRemovalRequest(request, 'requester')
      })

      it('should replay the acceptance without running validation again', () => {
        expect(responses()).toEqual([
          { ...request, status: 'accepted' },
          { ...request, status: 'accepted' }
        ])
        expect(validateDeletion).toHaveBeenCalledTimes(1)
      })

      it('should not apply or broadcast the deletion again', () => {
        expect(regularBytes.byteLength).toBe(0)
        expect(emitted.filter((message) => message.type === CommsMessage.CRDT)).toHaveLength(1)
      })
    })

    describe('and a fresh request targets the retired identity', () => {
      beforeEach(() => {
        request = { ...request, requestId: 2 }
        regularBytes = validator.processEntityRemovalRequest(request, 'requester')
      })

      it('should acknowledge that the entity was already removed', () => {
        expect(responses()[1]).toEqual({ ...request, status: 'accepted' })
        expect(validateDeletion).toHaveBeenCalledTimes(1)
        expect(regularBytes.byteLength).toBe(0)
      })
    })

    describe('and the requester reuses the request ID for another entity', () => {
      beforeEach(() => {
        request = { ...request, entityId: 901 as Entity }
        validator.processEntityRemovalRequest(request, 'requester')
      })

      it('should reject the changed identity rather than replaying an unrelated acceptance', () => {
        expect(responses()[1]).toEqual({ ...request, status: 'rejected' })
      })
    })

    describe('and later requests move the acceptance outside the replay window', () => {
      beforeEach(() => {
        for (let requestId = 2; requestId <= 130; requestId++) {
          validator.processEntityRemovalRequest({ ...request, requestId, entityId: 901 as Entity }, 'requester')
        }
        validateDeletion.mockClear()
        regularBytes = validator.processEntityRemovalRequest(request, 'requester')
      })

      it('should recover the acceptance from authoritative retirement without revalidation or another broadcast', () => {
        expect(responses()[130]).toEqual({ ...request, status: 'accepted' })
        expect(validateDeletion).not.toHaveBeenCalled()
        expect(regularBytes.byteLength).toBe(0)
        expect(emitted.filter((message) => message.type === CommsMessage.CRDT)).toHaveLength(1)
      })
    })
  })

  describe('and different requests arrive out of order inside the replay window', () => {
    let newerRequest: EntityRemovalRequest
    let otherEntity: Entity

    beforeEach(() => {
      otherEntity = engine.addEntity()
      Transform.create(otherEntity)
      NetworkEntity.create(otherEntity, { networkId: 7, entityId: 901 as Entity })
      newerRequest = { ...request, requestId: 128, entityId: 901 as Entity }
      validator.processEntityRemovalRequest(newerRequest, 'requester')
      regularBytes = validator.processEntityRemovalRequest(request, 'requester')
    })

    it('should validate and accept an unseen request at the oldest retained ID', () => {
      expect(responses()).toEqual([
        { ...newerRequest, status: 'accepted' },
        { ...request, status: 'accepted' }
      ])
      expect(validateDeletion).toHaveBeenCalledTimes(2)
      expect(regularBytes.byteLength).toBeGreaterThan(0)
    })

    describe('and both requests are retransmitted', () => {
      beforeEach(() => {
        validateDeletion.mockClear()
        validator.processEntityRemovalRequest(newerRequest, 'requester')
        validator.processEntityRemovalRequest(request, 'requester')
      })

      it('should retain both outcomes without revalidating either request', () => {
        expect(responses().slice(2)).toEqual([
          { ...newerRequest, status: 'accepted' },
          { ...request, status: 'accepted' }
        ])
        expect(validateDeletion).not.toHaveBeenCalled()
      })
    })
  })

  describe('and a first delivery is older than the replay window', () => {
    beforeEach(() => {
      validator.processEntityRemovalRequest({ ...request, requestId: 129, entityId: 901 as Entity }, 'requester')
      regularBytes = validator.processEntityRemovalRequest(request, 'requester')
    })

    it('should reject the stale request without validating or removing its entity', () => {
      expect(responses()[1]).toEqual({ ...request, status: 'rejected' })
      expect(validateDeletion).not.toHaveBeenCalled()
      expect(regularBytes.byteLength).toBe(0)
      expect(Transform.has(entity)).toBe(true)
    })
  })

  describe('and the component rejects removal', () => {
    beforeEach(() => {
      validateDeletion.mockReturnValue(false)
      regularBytes = validator.processEntityRemovalRequest(request, 'requester')
    })

    it('should return a correlated rejection without removing state or broadcasting', () => {
      expect(responses()).toEqual([{ ...request, status: 'rejected' }])
      expect(regularBytes.byteLength).toBe(0)
      expect(Transform.has(entity)).toBe(true)
      expect(emitted.filter((message) => message.type === CommsMessage.CRDT)).toHaveLength(0)
    })

    describe('and the component later allows removal', () => {
      beforeEach(() => {
        validateDeletion.mockReturnValue(true)
        validator.processEntityRemovalRequest(request, 'requester')
      })

      it('should replay the rejection without revalidating the duplicate', () => {
        expect(responses()[1]).toEqual({ ...request, status: 'rejected' })
        expect(validateDeletion).toHaveBeenCalledTimes(1)
        expect(Transform.has(entity)).toBe(true)
      })

      describe('and the client explicitly starts a fresh request', () => {
        beforeEach(() => {
          request = { ...request, requestId: 2 }
          validator.processEntityRemovalRequest(request, 'requester')
        })

        it('should validate the new attempt and accept it', () => {
          expect(responses()[2]).toEqual({ ...request, status: 'accepted' })
          expect(validateDeletion).toHaveBeenCalledTimes(2)
        })
      })
    })

    describe('and newer requests evict the result from the response cache', () => {
      beforeEach(() => {
        for (let requestId = 2; requestId <= 130; requestId++) {
          validator.processEntityRemovalRequest({ ...request, requestId }, 'requester')
        }
        validateDeletion.mockClear().mockReturnValue(true)
        validator.processEntityRemovalRequest(request, 'requester')
      })

      it('should reject the stale request without revalidating it', () => {
        expect(responses()[130]).toEqual({ ...request, status: 'rejected' })
        expect(validateDeletion).not.toHaveBeenCalled()
        expect(Transform.has(entity)).toBe(true)
      })
    })

    describe('and another peer subsequently removes the entity', () => {
      beforeEach(() => {
        validateDeletion.mockReturnValue(true)
        validator.processEntityRemovalRequest(request, 'other')
        validateDeletion.mockClear()
        regularBytes = validator.processEntityRemovalRequest(request, 'requester')
      })

      it('should report authoritative absence instead of replaying the earlier rejection', () => {
        expect(responses()[2]).toEqual({ ...request, status: 'accepted' })
        expect(validateDeletion).not.toHaveBeenCalled()
        expect(regularBytes.byteLength).toBe(0)
        expect(emitted.filter((message) => message.type === CommsMessage.CRDT)).toHaveLength(1)
      })
    })
  })

  describe('and a validation callback throws', () => {
    beforeEach(() => {
      validateDeletion.mockImplementation(() => {
        throw new Error('Scene validation failed')
      })
      regularBytes = validator.processEntityRemovalRequest(request, 'requester')
    })

    it('should reject the request and leave the entity intact', () => {
      expect(responses()).toEqual([{ ...request, status: 'rejected' }])
      expect(regularBytes.byteLength).toBe(0)
      expect(Transform.has(entity)).toBe(true)
    })
  })

  describe('and the requested network identity is unknown', () => {
    beforeEach(() => {
      request = { ...request, entityId: 901 as Entity }
      regularBytes = validator.processEntityRemovalRequest(request, 'requester')
    })

    it('should reject the request without creating a mapping or invoking validators', () => {
      expect(responses()).toEqual([{ ...request, status: 'rejected' }])
      expect(Array.from(engine.getEntitiesWith(NetworkEntity))).toHaveLength(1)
      expect(validateDeletion).not.toHaveBeenCalled()
    })
  })

  describe('and one peer exhausts its session quota', () => {
    beforeEach(() => {
      validateDeletion.mockReturnValue(false)
      for (let sessionIdLow = 1; sessionIdLow <= 8; sessionIdLow++) {
        validator.processEntityRemovalRequest({ ...request, sessionIdLow }, 'requester')
      }
      request = { ...request, sessionIdLow: 9 }
      validateDeletion.mockClear().mockReturnValue(true)
      validator.processEntityRemovalRequest(request, 'requester')
    })

    it('should reject new sessions without growing that peer cache', () => {
      expect(responses()[8]).toEqual({ ...request, status: 'rejected' })
      expect(validateDeletion).not.toHaveBeenCalled()
    })

    describe('and another peer requests removal', () => {
      beforeEach(() => {
        validator.processEntityRemovalRequest(request, 'other')
      })

      it('should leave the other peer able to request removal', () => {
        expect(responses()[9]).toEqual({ ...request, status: 'accepted' })
      })

      describe('and the quota-limited peer retries its request', () => {
        beforeEach(() => {
          validateDeletion.mockClear()
          regularBytes = validator.processEntityRemovalRequest(request, 'requester')
        })

        it('should acknowledge authoritative retirement even though its session quota is full', () => {
          expect(responses()[10]).toEqual({ ...request, status: 'accepted' })
          expect(validateDeletion).not.toHaveBeenCalled()
          expect(regularBytes.byteLength).toBe(0)
        })
      })
    })

    describe('and the peer leaves and reconnects with a fresh session', () => {
      beforeEach(() => {
        validator.forgetPeer('requester')
        validator.processEntityRemovalRequest(request, 'requester')
      })

      it('should allow the new room lifetime to register a session', () => {
        expect(responses()[9]).toEqual({ ...request, status: 'accepted' })
      })
    })
  })
})
