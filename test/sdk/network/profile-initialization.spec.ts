import { Engine, Entity, IEngine, Transform } from '../../../packages/@dcl/ecs'
import * as components from '../../../packages/@dcl/ecs/src/components'
import { addSyncTransport } from '../../../packages/@dcl/sdk/src/network/message-bus-sync'
import { fetchProfile } from '../../../packages/@dcl/sdk/src/network/utils'
import { IProfile } from '../../../packages/@dcl/sdk/src/network/message-bus-sync'
import { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'

function defineNetworkComponents(engine: IEngine): ReturnType<typeof components.NetworkEntity> {
  components.Transform(engine as any)
  const NetworkEntityComponent = components.NetworkEntity(engine as any)
  components.NetworkParent(engine as any)
  components.SyncComponents(engine as any)
  return NetworkEntityComponent
}

describe('network profile initialization', () => {
  describe('when syncEntity is called before the profile loads', () => {
    let engine: IEngine
    let entity: Entity
    let NetworkEntityComponent: ReturnType<typeof components.NetworkEntity>
    let resolveProfile: (response: GetUserDataResponse) => void
    let getUserData: jest.Mock<Promise<GetUserDataResponse>, [GetUserDataRequest]>
    let sendBinary: jest.Mock

    beforeEach(() => {
      engine = Engine()
      NetworkEntityComponent = defineNetworkComponents(engine)
      entity = engine.addEntity()
      components.Transform(engine as any).create(entity)
      resolveProfile = () => undefined
      getUserData = jest.fn(
        (_request: GetUserDataRequest) =>
          new Promise<GetUserDataResponse>((resolve) => {
            resolveProfile = resolve
          })
      )
      sendBinary = jest.fn().mockResolvedValue({ data: [] })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should apply the queued operation after initialization', async () => {
      const network = addSyncTransport(engine, sendBinary, getUserData)
      network.syncEntity(entity, [Transform.componentId])
      resolveProfile({
        data: { userId: 'user-id', version: 1, displayName: 'User', hasConnectedWeb3: false, avatar: undefined }
      })
      await network.ready

      expect(NetworkEntityComponent.has(entity)).toBe(true)
    })
  })

  describe('when the identity response has no user id', () => {
    let profile: IProfile
    let getUserData: jest.Mock<Promise<GetUserDataResponse>, [GetUserDataRequest]>

    beforeEach(() => {
      profile = {} as IProfile
      getUserData = jest.fn((_request: GetUserDataRequest) => Promise.resolve({ data: undefined }))
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should reject initialization with a descriptive error', async () => {
      await expect(fetchProfile(profile, getUserData)).rejects.toThrow("Couldn't fetch profile data")
    })
  })

  describe('when a queued network operation fails', () => {
    let engine: IEngine
    let firstEntity: Entity
    let duplicateEntity: Entity
    let entityAfterFailure: Entity
    let NetworkEntityComponent: ReturnType<typeof components.NetworkEntity>
    let resolveProfile: (response: GetUserDataResponse) => void
    let getUserData: jest.Mock<Promise<GetUserDataResponse>, [GetUserDataRequest]>
    let sendBinary: jest.Mock
    let network: ReturnType<typeof addSyncTransport>
    let consoleErrorMock: jest.SpyInstance

    beforeEach(() => {
      engine = Engine()
      NetworkEntityComponent = defineNetworkComponents(engine)
      firstEntity = engine.addEntity()
      duplicateEntity = engine.addEntity()
      entityAfterFailure = engine.addEntity()
      resolveProfile = () => undefined
      getUserData = jest.fn(
        (_request: GetUserDataRequest) =>
          new Promise<GetUserDataResponse>((resolve) => {
            resolveProfile = resolve
          })
      )
      sendBinary = jest.fn().mockResolvedValue({ data: [] })
      consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      network = addSyncTransport(engine, sendBinary, getUserData)
      network.syncEntity(firstEntity, [Transform.componentId], 1)
      network.syncEntity(duplicateEntity, [Transform.componentId], 1)
      network.syncEntity(entityAfterFailure, [Transform.componentId])
      resolveProfile({
        data: { userId: 'user-id', version: 1, displayName: 'User', hasConnectedWeb3: false, avatar: undefined }
      })
    })

    afterEach(() => {
      consoleErrorMock.mockRestore()
      jest.restoreAllMocks()
    })

    it('should continue applying the remaining operations', async () => {
      await network.ready

      expect(NetworkEntityComponent.has(entityAfterFailure)).toBe(true)
    })
  })

  describe('when profile initialization fails before a transport tick', () => {
    let engine: IEngine
    let getUserData: jest.Mock<Promise<GetUserDataResponse>, [GetUserDataRequest]>
    let sendBinary: jest.Mock
    let network: ReturnType<typeof addSyncTransport>
    let consoleErrorMock: jest.SpyInstance

    beforeEach(() => {
      engine = Engine()
      defineNetworkComponents(engine)
      getUserData = jest.fn().mockRejectedValue(new Error('identity unavailable'))
      sendBinary = jest.fn().mockResolvedValue({ data: [] })
      consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      network = addSyncTransport(engine, sendBinary, getUserData)
    })

    afterEach(() => {
      consoleErrorMock.mockRestore()
      jest.restoreAllMocks()
    })

    it('should let the engine update complete', async () => {
      await network.ready.catch(() => undefined)

      await expect(engine.update(1)).resolves.toBeUndefined()
    })

    it('should not send network messages', async () => {
      await network.ready.catch(() => undefined)
      await engine.update(1)

      expect(sendBinary).not.toHaveBeenCalled()
    })
  })
})
