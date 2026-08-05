/**
 * Shared 3-engine comms harness (server + 2 clients).
 *
 * Extracted from the topology inlined in `server-client-connectivity.spec.ts`
 * (3 engines + a routeMessage function simulating comms) so the
 * characterization / red-defect specs can reuse the exact same wiring.
 *
 * Routing rules match the production client-server topology:
 *   - a client can only reach the authoritative server
 *   - the server reaches the addresses it asks for, or every client when the
 *     address list is empty (broadcast)
 */
import { Engine, Entity, IEngine } from '../../../../packages/@dcl/ecs'
import * as components from '../../../../packages/@dcl/ecs/dist/components'
import { addSyncTransport } from '../../../../packages/@dcl/sdk/src/network/message-bus-sync'
import {
  CommsMessage,
  craftCommsMessage,
  encodeString
} from '../../../../packages/@dcl/sdk/src/network/binary-message-bus'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

export const SERVER = 'authoritative-server'
export const CLIENT_A = 'clientA'
export const CLIENT_B = 'clientB'

export type NetworkComponents = ReturnType<typeof defineComponents>
export type Sync = ReturnType<typeof addSyncTransport>

export type Peer = {
  id: string
  engine: IEngine
  components: NetworkComponents
  sync: Sync
}

/** One entry per `sendBinary` peerData payload that crossed the wire. */
export type SentRecord = {
  from: string
  /** the address array the peer asked for; `[]` means "broadcast" */
  to: string[]
  type: CommsMessage
  payload: Uint8Array
}

export function defineComponents(engine: IEngine) {
  return {
    Transform: components.Transform(engine),
    NetworkEntity: components.NetworkEntity(engine),
    NetworkParent: components.NetworkParent(engine),
    SyncComponents: components.SyncComponents(engine),
    CreatedBy: components.CreatedBy(engine),
    EngineInfo: components.EngineInfo(engine)
  }
}

/** Resolve the local entity a peer uses for a given network identity. */
export function findNetworkEntity(peer: Peer, networkId: number, entityId: Entity): Entity | undefined {
  for (const [local, network] of peer.engine.getEntitiesWith(peer.components.NetworkEntity)) {
    if (network.networkId === networkId && network.entityId === entityId) return local
  }
  return undefined
}

/** Let module-level promises (profile fetch, isServer) settle. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** every engine `attach` ever built, so a realm write reaches all of them at once */
const attachedEngines: IEngine[] = []

/**
 * Writes `RealmInfo` on every attached peer, which is what comms coming up looks
 * like from inside a scene. `onChange` callbacks only fire from the CRDT receive
 * path, hence the explicit `__onChangeCallbacks` call.
 */
export function setRealmConnected(isConnectedSceneRoom: boolean): void {
  const value = {
    baseUrl: 'http://localhost:8000',
    realmName: 'test-realm',
    networkId: 1,
    commsAdapter: 'offline',
    isPreview: true,
    room: 'scene-room',
    isConnectedSceneRoom
  }
  for (const engine of attachedEngines) {
    const RealmInfo = components.RealmInfo(engine)
    RealmInfo.createOrReplace(engine.RootEntity, value)
    // `__onChangeCallbacks` is @internal, so it is trimmed from the published types
    const internal = RealmInfo as unknown as { __onChangeCallbacks(entity: Entity, value: unknown): void }
    internal.__onChangeCallbacks(engine.RootEntity, value)
  }
}

export function createHarness() {
  const queues: Record<string, Uint8Array[]> = {}
  const peers: Record<string, Peer> = {}
  const sent: SentRecord[] = []
  /** every comms message that landed in a peer's inbox */
  const delivered: { to: string; from: string; type: CommsMessage }[] = []

  function withSender(sender: string, data: Uint8Array): Uint8Array {
    const senderBytes = encodeString(sender)
    const out = new Uint8Array(data.byteLength + senderBytes.byteLength + 1)
    out.set([senderBytes.byteLength], 0)
    out.set(senderBytes, 1)
    out.set(data, senderBytes.byteLength + 1)
    return out
  }

  function deliver(target: string, sender: string, data: Uint8Array) {
    if (!(target in queues)) return
    delivered.push({ to: target, from: sender, type: data[0] as CommsMessage })
    queues[target].push(withSender(sender, data))
  }

  function route(data: Uint8Array, addresses: string[], from: string) {
    sent.push({ from, to: [...addresses], type: data[0] as CommsMessage, payload: data.subarray(1) })
    const targets =
      from === SERVER
        ? addresses.length === 0
          ? Object.keys(queues).filter((id) => id !== SERVER)
          : addresses.filter((address) => address !== SERVER)
        : [SERVER]
    for (const target of targets) deliver(target, from, data)
  }

  /** `isServer` may be a pending promise to reproduce a role that resolves late */
  function attach(id: string, isServer: boolean | Promise<boolean>): Peer {
    queues[id] = queues[id] ?? []
    const engine = Engine()
    attachedEngines.push(engine)
    const peerComponents = defineComponents(engine)
    const sendBinary = async (msg: SendBinaryRequest): Promise<SendBinaryResponse> => {
      for (const peerData of msg.peerData) {
        for (const data of peerData.data) route(data, peerData.address, id)
      }
      const response = [...queues[id]]
      queues[id].length = 0
      return { data: response }
    }
    const sync = addSyncTransport(
      engine,
      sendBinary,
      async () => ({
        data: { userId: id, version: 1, displayName: id, hasConnectedWeb3: true, avatar: undefined }
      }),
      async () => ({ isServer: await isServer }),
      id,
      // the harness asserts on the very first frames, so nothing is suppressed
      { transportInitializedTicks: 0 }
    )
    peers[id] = { id, engine, components: peerComponents, sync }
    return peers[id]
  }

  const server = attach(SERVER, true)
  const clientA = attach(CLIENT_A, false)
  const clientB = attach(CLIENT_B, false)

  async function tick(rounds = 4, dt = 1) {
    for (let i = 0; i < rounds; i++) {
      await Promise.all(Object.values(peers).map((peer) => peer.engine.update(dt)))
    }
  }

  return {
    server,
    clientA,
    clientB,
    peers,
    sent,
    tick,
    /** also usable to replace a peer with a fresh engine keeping its comms identity */
    attach,
    /** throw away what piled up for a peer, the way a real disconnect does */
    drop(peerId: string) {
      queues[peerId].length = 0
    },
    /** push a comms message into a peer's inbox as if `sender` had emitted it */
    inject(target: string, sender: string, type: CommsMessage, payload: Uint8Array) {
      deliver(target, sender, craftCommsMessage(type, payload))
    },
    sentBy(from: string, type?: CommsMessage) {
      return sent.filter((record) => record.from === from && (type === undefined || record.type === type))
    },
    deliveredTo(to: string, type?: CommsMessage) {
      return delivered.filter((record) => record.to === to && (type === undefined || record.type === type))
    },
    clear() {
      sent.length = 0
      delivered.length = 0
    },
    async connect() {
      await flush()
      setRealmConnected(true)
      await tick()
    },
    entities(peer: Peer): Entity[] {
      return Array.from(peer.engine.getEntitiesWith(peer.components.NetworkEntity)).map(([entity]) => entity)
    }
  }
}

export type Harness = ReturnType<typeof createHarness>
