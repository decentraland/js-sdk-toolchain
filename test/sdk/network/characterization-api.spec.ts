/**
 * Characterization: the public surface of `@dcl/sdk/network` and
 * `@dcl/sdk/network/events`.
 *
 * Importing `network/index.ts` has side effects (it boots the sync transport on
 * the global engine and registers the global room), which is exactly what a
 * scene gets, so the module is loaded once here and the exported helpers are
 * driven against the global engine.
 *
 * Already covered elsewhere (not duplicated here):
 *   - `syncEntity` propagating an entity + component through comms and the
 *     NetworkEntity mapping seen by the other peers:
 *     `server-client-connectivity.spec.ts`
 *   - `isStateSyncronized()` flipping to true after the hydration handshake, and
 *     the room send/onMessage round-trip: `characterization-flow.spec.ts`
 *
 * What is new here: the exported name set, the pre-resolution state of the
 * async runtime APIs (`isServer`, `myProfile`), the local semantics of the
 * entity helpers (parenting, children, error messages, non-syncable component
 * stripping) and the `registerMessages`/`getRoom` contract.
 */
import type * as NetworkApi from '../../../packages/@dcl/sdk/src/network/index'
import {
  Entity,
  NetworkEntity,
  NetworkParent,
  Schemas,
  SyncComponents,
  Transform,
  UiTransform,
  engine
} from '../../../packages/@dcl/ecs'
import { componentNumberFromName } from '../../../packages/@dcl/ecs/dist/components/component-number'
import type { Room } from '../../../packages/@dcl/sdk/src/network/events/implementation'

const mockSendBinary = jest.fn(async () => ({ data: [] as Uint8Array[] }))
const mockGetUserData = jest.fn()
const mockIsServer = jest.fn()

// `~system/*` only exists as ambient type declarations, hence `virtual: true`
jest.mock('~system/CommunicationsController', () => ({ sendBinary: () => mockSendBinary() }), { virtual: true })
jest.mock('~system/UserIdentity', () => ({ getUserData: () => mockGetUserData() }), { virtual: true })
jest.mock('~system/EngineApi', () => ({ isServer: () => mockIsServer() }), { virtual: true })

const USER_ID = '0xsome-user'

/** Compile-time signature pins. Never executed: the body only has to typecheck. */
function signaturePins() {
  const api = {} as typeof NetworkApi

  const syncEntity: (entityId: Entity, componentIds: number[], entityEnumId?: number) => void = api.syncEntity
  const parentEntity: (entity: Entity, parent: Entity) => void = api.parentEntity
  const getParent: (child: Entity) => Entity | undefined = api.getParent
  const getChildren: (parent: Entity) => Iterable<Entity> = api.getChildren
  const getFirstChild: (entity: Entity) => Entity = api.getFirstChild
  const removeParent: (entity: Entity) => void = api.removeParent
  const isServer: () => boolean = api.isServer
  const isStateSyncronized: () => boolean = api.isStateSyncronized
  const myProfile: { networkId: number; userId: string } = api.myProfile
  void [syncEntity, parentEntity, getParent, getChildren, getFirstChild, removeParent]
  void [isServer, isStateSyncronized, myProfile]

  // @ts-expect-error componentIds is required
  api.syncEntity(0 as Entity)
  // @ts-expect-error entityEnumId is a number, not a string
  api.syncEntity(0 as Entity, [], 'enum-id')
  // @ts-expect-error parentEntity needs both entities
  api.parentEntity(0 as Entity)
  // @ts-expect-error myProfile only carries networkId and userId
  void api.myProfile.address
}

describe('@dcl/sdk/network public surface characterization', () => {
  let network: typeof NetworkApi
  let resolveIsServer!: (value: { isServer: boolean }) => void
  let resolveUserData!: (value: unknown) => void
  // one shared deferred per API: `isServer` is queried more than once at boot
  const isServerResponse = new Promise<{ isServer: boolean }>((resolve) => (resolveIsServer = resolve))
  const userDataResponse = new Promise<unknown>((resolve) => (resolveUserData = resolve))

  beforeAll(async () => {
    mockIsServer.mockImplementation(() => isServerResponse)
    mockGetUserData.mockImplementation(() => userDataResponse)
    network = await import('../../../packages/@dcl/sdk/src/network/index')
  })

  it('exports exactly the documented names', async () => {
    expect(Object.keys(network).sort()).toEqual([
      'binaryMessageBus',
      'eventBus',
      'getChildren',
      'getFirstChild',
      'getParent',
      'getRoom',
      'isServer',
      'isStateSyncronized',
      'myProfile',
      'parentEntity',
      'registerMessages',
      'removeParent',
      'syncEntity'
    ])
    const events = await import('../../../packages/@dcl/sdk/src/network/events')
    expect(Object.keys(events).sort()).toEqual(['getRoom', 'registerMessages'])
  })

  // NOTE: declared before the rest on purpose — it settles the runtime APIs the
  // following tests depend on.
  it('reports isServer() === false and an empty myProfile until the runtime APIs settle', async () => {
    expect(network.isServer()).toBe(false)
    expect(network.myProfile).toEqual({})
    expect(network.isStateSyncronized()).toBe(false)
    // the role is asked twice at boot: once for the exported isServer(), once
    // inside addSyncTransport — two independent atoms over the same answer
    expect(mockIsServer).toHaveBeenCalledTimes(2)
    expect(mockGetUserData).toHaveBeenCalledTimes(1)

    resolveIsServer({ isServer: true })
    resolveUserData({ data: { userId: USER_ID, version: 1, displayName: 'u', hasConnectedWeb3: true } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(network.isServer()).toBe(true)
    expect(Object.keys(network.myProfile).sort()).toEqual(['networkId', 'userId'])
    expect(network.myProfile.userId).toBe(USER_ID)
    // the networkId is derived from the user id, it is not random
    expect(network.myProfile.networkId).toBe(componentNumberFromName(USER_ID))
  })

  describe('entity helpers', () => {
    it('syncEntity tags the entity with NetworkEntity + SyncComponents', () => {
      const entity = engineEntity()
      network.syncEntity(entity, [Transform.componentId])

      expect(NetworkEntity.get(entity)).toEqual({ entityId: entity, networkId: network.myProfile.networkId })
      expect(SyncComponents.get(entity)).toEqual({ componentIds: [Transform.componentId] })
    })

    it('syncEntity strips components that cannot be synced and warns about them', () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => {})
      const entity = engineEntity()
      network.syncEntity(entity, [Transform.componentId, UiTransform.componentId])

      expect(SyncComponents.get(entity)).toEqual({ componentIds: [Transform.componentId] })
      expect(log).toHaveBeenCalledWith(expect.stringContaining("can't be sync through the network"))
      log.mockRestore()
    })

    it('syncEntity with an entityEnumId pins networkId 0 and rejects a reused id', () => {
      const entity = engineEntity()
      network.syncEntity(entity, [Transform.componentId], 42)
      expect(NetworkEntity.get(entity)).toEqual({ entityId: 42, networkId: 0 })

      const other = engineEntity()
      expect(() => network.syncEntity(other, [Transform.componentId], 42)).toThrowError(
        'syncEntity failed because the id provided is already in use'
      )
    })

    it('parentEntity / getParent / getChildren / removeParent operate on the network identity', () => {
      const parent = engineEntity()
      const child = engineEntity()
      network.syncEntity(parent, [Transform.componentId])
      network.syncEntity(child, [Transform.componentId])

      expect(network.getParent(child)).toBeUndefined()
      expect(Array.from(network.getChildren(parent))).toEqual([])

      network.parentEntity(child, parent)

      expect(NetworkParent.get(child)).toEqual(NetworkEntity.get(parent))
      expect(network.getParent(child)).toBe(parent)
      expect(Array.from(network.getChildren(parent))).toEqual([child])
      expect(network.getFirstChild(parent)).toBe(child)
      // parenting always leaves a Transform behind so the renderer gets the parent
      expect(Transform.has(child)).toBe(true)

      network.removeParent(child)
      expect(NetworkParent.getOrNull(child)).toBeNull()
      expect(network.getParent(child)).toBeUndefined()
      expect(Array.from(network.getChildren(parent))).toEqual([])
      expect(network.getFirstChild(parent)).toBeUndefined()
    })

    it('getChildren of a non-synced entity is empty, parentEntity / removeParent throw', () => {
      const plain = engineEntity()
      const synced = engineEntity()
      network.syncEntity(synced, [])

      expect(Array.from(network.getChildren(plain))).toEqual([])
      expect(() => network.parentEntity(synced, plain)).toThrowError(
        'Entity is not sync. Call syncEntity on the parent.'
      )
      expect(() => network.removeParent(plain)).toThrowError('Entity is not sync')
    })
  })

  describe('room messaging surface', () => {
    it('registerMessages and getRoom hand out the single global room', () => {
      const first = network.registerMessages({ ping: Schemas.Map({ text: Schemas.String }) })
      const second = network.registerMessages({ pong: Schemas.Map({ text: Schemas.String }) })

      expect(first).toBe(second)
      expect(network.getRoom()).toBe(first)
      expect(network.eventBus).toBe(first)
    })

    it('onMessage returns an unsubscribe and the room is not ready before comms', () => {
      const room = network.getRoom() as Room
      const unsubscribe = room.onMessage('ping', () => {})

      expect(room.listenerCount('ping')).toBe(1)
      unsubscribe()
      expect(room.listenerCount('ping')).toBe(0)
      expect(room.isReady()).toBe(false)
    })
  })

  it('pins the exported signatures (compile-time only)', () => {
    expect(typeof signaturePins).toBe('function')
  })
})

/** The network module wires the global engine, so the helpers act on it. */
function engineEntity(): Entity {
  return engine.addEntity()
}
