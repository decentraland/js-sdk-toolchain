import { Entity, IEngine, Transport } from '@dcl/ecs'
import { type SendBinaryRequest, type SendBinaryResponse } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { BinaryMessageBus, CommsMessage } from './binary-message-bus'
import { fetchProfile } from './utils'
import { entityUtils } from './entities'
import { createServerValidator } from './server'
import { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'
import { getPlayerHelper } from '../players'
import { serializeCrdtMessages } from '../internal/transports/logger'
import { IsServerRequest, IsServerResponse } from '~system/EngineApi'
import { AUTH_SERVER_PEER_ID, DEBUG_NETWORK_MESSAGES, IProfile } from './constants'
import { createRuntimeContext } from './runtime-context'
import { setGlobalRoom, Room } from './events/implementation'
import { components } from './ecs-adapter'
import {
  HydrationEffect,
  createHydration,
  decodeGeneration,
  encodeGeneration,
  newGeneration,
  stateResponse
} from './hydration'

export { AUTH_SERVER_PEER_ID, DEBUG_NETWORK_MESSAGES } from './constants'
export type { IProfile } from './constants'

/** how much comms may pile up while the peer does not know its own role yet */
const MAX_BUFFERED_COMMS = 256

// Test environment detection without 'as any'
const isTestEnvironment = (): boolean => {
  try {
    if (typeof globalThis === 'undefined') return false
    const globalWithProcess = globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }
    return globalWithProcess.process?.env?.NODE_ENV === 'test'
  } catch {
    return false
  }
}

export function addSyncTransport(
  engine: IEngine,
  sendBinary: (msg: SendBinaryRequest) => Promise<SendBinaryResponse>,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>,
  isServerFn: (request: IsServerRequest) => Promise<IsServerResponse>,
  name: string
) {
  // Profile Info
  const myProfile: IProfile = {} as IProfile
  fetchProfile(myProfile!, getUserData)

  const { isServerAtom, isRoomReadyAtom } = createRuntimeContext(isServerFn)

  // Entity utils
  const entityDefinitions = entityUtils(engine, myProfile)

  // List of MessageBuss messsages to be sent on every frame to comms
  const pendingMessageBusMessagesToSend: { data: Uint8Array[]; address: string[] }[] = []

  const binaryMessageBus = BinaryMessageBus((data, address) => {
    pendingMessageBusMessagesToSend.push({ data: [data], address: address ?? [] })
  })

  function getMessagesToSend(): typeof pendingMessageBusMessagesToSend {
    const messages = [...pendingMessageBusMessagesToSend]
    pendingMessageBusMessagesToSend.length = 0
    return messages
  }
  const players = getPlayerHelper(engine)

  const RealmInfo = components.RealmInfo(engine)
  const NetworkEntity = components.NetworkEntity(engine)
  const hydration = createHydration()
  /** names this run of the peer; only an authoritative server ever announces it */
  const generation = newGeneration()

  /**
   * We need to wait till 2 ticks that is when the engine is ready to send new messages.
   * The first tick is for the client engine processing the CRDT messages,
   * and the second one are the messages created by the main() function.
   * So to avoid sending those messages, that all the clients have, through the network we put this validation here.
   */
  let tick = 0
  const TRANSPORT_INITIALIZED_NUMBER = isTestEnvironment() ? 0 : 2

  /**
   * Who this peer's own CRDT is addressed to. A client only ever talks to the
   * authoritative server; the server's fan-out to the room is legitimate, so it
   * keeps broadcasting (`undefined` — an empty address list means broadcast).
   *
   * Comms is buffered until the role resolves, so nothing *received* is handled
   * before it is known. `transport.send` is not: it runs on the engine clock and
   * can reach here first. Broadcasting in that window is the pre-role fallback,
   * not a leftover of the peer-to-peer topology.
   */
  function crdtAudience(): string[] | undefined {
    return isServerAtom.getOrNull() === false ? [AUTH_SERVER_PEER_ID] : undefined
  }
  // Add Sync Transport
  const transport: Transport = {
    filter: syncFilter(engine),
    send: async (messages) => {
      if (tick <= TRANSPORT_INITIALIZED_NUMBER) tick++
      for (const message of tick > TRANSPORT_INITIALIZED_NUMBER ? [messages].flat() : []) {
        if (message.byteLength) {
          DEBUG_NETWORK_MESSAGES() &&
            console.log(...Array.from(serializeCrdtMessages('[NetworkMessage sent]:', message, engine)))

          // Convert regular messages to network messages for broadcasting with chunking
          for (const chunk of serverValidator.convertRegularToNetworkMessage(message)) {
            binaryMessageBus.emit(CommsMessage.CRDT, chunk, crdtAudience())
          }
        }
      }
      const peerMessages = getMessagesToSend()
      const response = await sendBinary({ data: [], peerData: peerMessages })
      binaryMessageBus.__processMessages(response.data)
    },
    type: name
  }

  // `onmessage` is wired by `engine.addTransport`; a comms message that arrives
  // before that (or after a transport swap) must not take the handler down.
  function deliverToEngine(buffer: Uint8Array) {
    if (!transport.onmessage) {
      DEBUG_NETWORK_MESSAGES() && console.log('[deliverToEngine] transport not wired yet, dropping', buffer.byteLength)
      return
    }
    transport.onmessage(buffer)
  }

  // Server validation setup
  const serverValidator = createServerValidator({
    engine,
    binaryMessageBus
  })

  // Initialize Event Bus with registered schemas
  const eventBus = new Room(engine, binaryMessageBus, isServerAtom, isRoomReadyAtom)

  // Set global eventBus instance
  setGlobalRoom(eventBus)

  engine.addTransport(transport)
  // End add sync transport

  /**
   * Comms that lands before `isServerAtom` resolves cannot be routed — the server
   * and the client path are different — so it waits here and is replayed in
   * arrival order once the role is known.
   *
   * ponytail: a fixed cap and a loud drop instead of back-pressure. The window is
   * one runtime round-trip, so an overflow already means something upstream is
   * broken. Upgrade path: hold off polling comms until the role is known.
   */
  const bufferedComms: (() => void)[] = []

  function onComms(message: CommsMessage, handler: (value: Uint8Array, sender: string) => void) {
    binaryMessageBus.on(message, (value, sender) => {
      if (isServerAtom.getOrNull() !== null) return handler(value, sender)
      if (bufferedComms.length >= MAX_BUFFERED_COMMS) {
        console.error(`[network] role still unresolved and the comms buffer is full, dropping ${CommsMessage[message]}`)
        return
      }
      bufferedComms.push(() => handler(value, sender))
    })
  }

  function applyEffects(effects: HydrationEffect[]) {
    for (const effect of effects) {
      if (effect === 'requestState') {
        DEBUG_NETWORK_MESSAGES() && console.log('Requesting state...')
        // unconditionally addressed: the FSM only ever asks for state as a client
        binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array(), [AUTH_SERVER_PEER_ID])
      } else if (effect === 'markSynced') {
        // the room only counts as ready once comms has answered at least once
        if (RealmInfo.getOrNull(engine.RootEntity)) {
          DEBUG_NETWORK_MESSAGES() && console.log('[isRoomReady] Marking room as ready after state sync')
          isRoomReadyAtom.swap(true)
        }
      } else if (effect === 'announce') {
        binaryMessageBus.emit(CommsMessage.SERVER_ANNOUNCE, encodeGeneration(generation))
      }
      // 'reconcile' is applied by the RES_CRDT_STATE handler, the only place that
      // holds the dump it has to be reconciled against
    }
  }

  /** the state dump being applied; the server may split one over several chunks */
  let dump: { entities: Set<Entity>; reconcile: boolean; quiet: boolean } | null = null

  /**
   * A re-hydration dump is the authoritative world in full, so a network entity it
   * does not name no longer exists. Only NetworkEntity-tagged entities are looked
   * at — local-only entities are invisible to the network layer and never touched.
   * Dropping the tag before removing the entity is what keeps the removal local:
   * `syncFilter` forwards a DELETE_ENTITY only for entities that still carry it.
   */
  function reconcileWithDump(present: Set<Entity>) {
    const stale = Array.from(engine.getEntitiesWith(NetworkEntity))
      .map(([entity]) => entity)
      .filter((entity) => !present.has(entity))
    for (const entity of stale) {
      DEBUG_NETWORK_MESSAGES() && console.log('[reconcile] dropping entity absent from the state dump', entity)
      NetworkEntity.deleteFrom(entity)
      engine.removeEntity(entity)
    }
  }

  // Receive & Process CRDT_STATE
  onComms(CommsMessage.REQ_CRDT_STATE, (_data, sender) => {
    // only the authoritative peer owns the world: a client answering here would
    // hand its own partial view to another client
    if (!isServerAtom.getOrNull()) return
    DEBUG_NETWORK_MESSAGES() && console.log('[REQ_CRDT_STATE]', sender, Date.now())
    // name the world before shipping it, so the requester can tell a later restart apart
    binaryMessageBus.emit(CommsMessage.SERVER_ANNOUNCE, encodeGeneration(generation), [sender])
    const chunks = engineToCrdt(engine)
    if (chunks.length === 0) {
      DEBUG_NETWORK_MESSAGES() && console.log('[Emiting empty state:]', sender, Date.now())
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, new Uint8Array(), [sender])
    } else {
      for (const chunk of chunks) {
        DEBUG_NETWORK_MESSAGES() && console.log('[Emiting:]', sender, Date.now())
        binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, chunk, [sender])
      }
    }
  })
  onComms(CommsMessage.RES_CRDT_STATE, (data, sender) => {
    const event = stateResponse(sender)
    if (!event || isServerAtom.getOrNull()) return
    DEBUG_NETWORK_MESSAGES() && console.log('[Processing CRDT State]', data.byteLength / 1024, 'KB')

    const firstChunk = dump === null
    const current = (dump = dump ?? { entities: new Set<Entity>(), reconcile: false, quiet: false })
    current.quiet = false
    if (data.byteLength > 0) {
      deliverToEngine(serverValidator.processClientMessages(data, sender, false, current.entities))
    }

    const effects = hydration.send(event)
    // only the head of a dump decides: every chunk after it describes the same world
    if (firstChunk) current.reconcile = effects.includes('reconcile')
    applyEffects(effects)
  })

  onComms(CommsMessage.SERVER_ANNOUNCE, (data, sender) => {
    if (sender !== AUTH_SERVER_PEER_ID) return
    applyEffects(hydration.send({ type: 'serverAnnounced', generation: decodeGeneration(data) }))
  })

  // received message from the network
  onComms(CommsMessage.CRDT, (value, sender) => {
    const isServer = isServerAtom.getOrNull()
    DEBUG_NETWORK_MESSAGES() &&
      console.log(
        transport.type,
        ...Array.from(serializeCrdtMessages('[NetworkMessage received]:', value, engine)),
        isServer
      )
    if (isServer) {
      deliverToEngine(serverValidator.processServerMessages(value, sender))
    } else if (sender === AUTH_SERVER_PEER_ID) {
      // Process network messages from server and convert to regular messages
      deliverToEngine(serverValidator.processClientMessages(value, sender))
    }
  })

  // received authoritative message from server - force apply to fix invalid local state
  onComms(CommsMessage.CRDT_AUTHORITATIVE, (value, sender) => {
    // Only accept authoritative messages from authoritative server
    if (sender !== AUTH_SERVER_PEER_ID) return

    DEBUG_NETWORK_MESSAGES() &&
      console.log('[AUTHORITATIVE] Received authoritative message from server:', value.byteLength, 'bytes')

    // Process authoritative messages by forcing them through normal CRDT processing
    // but with a timestamp that's guaranteed to be accepted
    const authoritativeBuffer = serverValidator.processClientMessages(value, sender, true)
    if (authoritativeBuffer.byteLength > 0) {
      // Apply authoritative message through normal transport, but the server's messages
      // should be processed as authoritative with special timestamp handling
      deliverToEngine(authoritativeBuffer)

      DEBUG_NETWORK_MESSAGES() && console.log('[AUTHORITATIVE] Applied server authoritative message to local state')
    }
  })

  players.onEnterScene((player) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onEnterScene]', player.userId)
    if (myProfile.userId === player.userId) applyEffects(hydration.send({ type: 'ownPlayerEntered' }))
  })

  /**
   * Why ask for the state when the server already pushes it to whoever joins?
   * The server does send it on the livekit JOIN_PARTICIPANT event, but unity takes
   * long enough getting there that the push is not delivered. So the client asks
   * once comms is up, and the server answers.
   */
  RealmInfo.onChange(engine.RootEntity, (value) => {
    if (value?.isConnectedSceneRoom) {
      applyEffects(hydration.send({ type: 'realmConnected' }))
      // a server hydrates from nobody, so being on comms is all it waits for
      if (isServerAtom.getOrNull() && isRoomReadyAtom.getOrNull() === false) {
        DEBUG_NETWORK_MESSAGES() && console.log('[isRoomReady] Server marking room as ready')
        isRoomReadyAtom.swap(true)
      }
      return
    }
    // only react when actually transitioning from ready to not ready
    if (isRoomReadyAtom.getOrNull() === true) {
      DEBUG_NETWORK_MESSAGES() && console.log('Disconnected from comms')
      isRoomReadyAtom.swap(false)
      applyEffects(hydration.send({ type: 'realmDisconnected' }))
    }
  })

  // drives the state-request retry, and closes a dump once its chunks stop coming
  engine.addSystem((dt: number) => {
    applyEffects(hydration.send({ type: 'tick', dt }))
    if (!dump) return
    // one silent frame before deciding what the dump left out, so a dump split
    // over several chunks is judged whole instead of chunk by chunk.
    // ponytail: a quiet frame, not a terminator — a chunk delayed by more than a
    // frame reconciles early and its entities are dropped and re-created (churn,
    // not divergence). Upgrade path: mark the last chunk of a dump on the wire.
    if (!dump.quiet) {
      dump.quiet = true
      return
    }
    if (dump.reconcile) reconcileWithDump(dump.entities)
    dump = null
  })

  void isServerAtom.pipe((isServer) => {
    applyEffects(hydration.send({ type: 'roleResolved', isServer }))
    for (const replay of bufferedComms.splice(0)) replay()
  })

  players.onLeaveScene((userId) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onLeaveScene]', userId)
  })

  return {
    ...entityDefinitions,
    myProfile,
    isStateSyncronized: hydration.isSynced,
    binaryMessageBus,
    eventBus,
    isServerAtom,
    isRoomReadyAtom
  }
}
