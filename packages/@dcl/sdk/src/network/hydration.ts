// Hydration state machine.
//
// Pure logic: no engine, no comms, no clock. `message-bus-sync` translates comms
// and engine signals into events and runs the effects handed back, which is what
// makes every transition testable without a running engine.
//
//   DISCONNECTED --realm connected--> CONNECTED --role client--> REQUESTING_STATE
//        ^                                |                            |
//        |                                +--role server--> SYNCED <---+ state dump
//        +---------------- realm disconnected ----------------+
//
// A SYNCED client goes back to REQUESTING_STATE when the authoritative peer
// announces a generation other than the one it hydrated from (server restart).

import { AUTH_SERVER_PEER_ID } from './constants'

/** seconds to wait for a state dump before asking again */
export const STATE_REQUEST_RETRY_INTERVAL = 2.0

export type HydrationState = 'DISCONNECTED' | 'CONNECTED' | 'REQUESTING_STATE' | 'SYNCED'

export type HydrationEffect =
  /** emit REQ_CRDT_STATE */
  | 'requestState'
  /** the peer now holds the authoritative world */
  | 'markSynced'
  /** the dump being applied replaces a world we already had: drop what it omits */
  | 'reconcile'
  /** broadcast this peer's server generation */
  | 'announce'

// Minting a `stateReceived` event requires this symbol, and only `stateResponse`
// has it. A RES_CRDT_STATE from a peer that is not the authoritative server can
// therefore not be turned into an event at all, let alone reset the retry timer.
const FROM_AUTHORITATIVE_SERVER: unique symbol = Symbol('from-authoritative-server')

export type HydrationEvent =
  | { type: 'roleResolved'; isServer: boolean }
  | { type: 'realmConnected' }
  | { type: 'realmDisconnected' }
  | { type: 'ownPlayerEntered' }
  | { type: 'serverAnnounced'; generation: number }
  | { type: 'tick'; dt: number }
  | { type: 'stateReceived'; [FROM_AUTHORITATIVE_SERVER]: true }

/** The only constructor of a `stateReceived` event. */
export function stateResponse(sender: string): HydrationEvent | null {
  return sender === AUTH_SERVER_PEER_ID ? { type: 'stateReceived', [FROM_AUTHORITATIVE_SERVER]: true } : null
}

export type Hydration = {
  state(): HydrationState
  isSynced(): boolean
  /** `null` is accepted so callers can forward a rejected `stateResponse()` as-is */
  send(event: HydrationEvent | null): HydrationEffect[]
}

export function createHydration(): Hydration {
  let state: HydrationState = 'DISCONNECTED'
  let role: 'unknown' | 'server' | 'client' = 'unknown'
  let elapsedSinceRequest = 0
  /** a dump has already been applied: the next one replaces a world we had */
  let hydrated = false
  /** generation of the authoritative peer we are talking to */
  let generation: number | null = null

  function requestState(): HydrationEffect[] {
    state = 'REQUESTING_STATE'
    elapsedSinceRequest = 0
    return ['requestState']
  }

  function serverIsReady(): HydrationEffect[] {
    if (state === 'SYNCED') return []
    state = 'SYNCED'
    return ['markSynced', 'announce']
  }

  /** realm is up: what happens next only depends on the role */
  function onLine(): HydrationEffect[] {
    if (role === 'unknown') {
      state = 'CONNECTED'
      return []
    }
    return role === 'server' ? serverIsReady() : requestState()
  }

  function send(event: HydrationEvent | null): HydrationEffect[] {
    if (!event) return []
    switch (event.type) {
      case 'roleResolved':
        role = event.isServer ? 'server' : 'client'
        // a server is authoritative by definition, it never hydrates from anyone
        if (role === 'server') return serverIsReady()
        return state === 'CONNECTED' ? requestState() : []

      case 'realmConnected':
        return state === 'DISCONNECTED' ? onLine() : []

      case 'realmDisconnected':
        if (role === 'server' || state === 'DISCONNECTED') return []
        state = 'DISCONNECTED'
        return []

      case 'ownPlayerEntered':
        // the trigger that covers a room whose readiness landed before the profile
        return state === 'CONNECTED' ? onLine() : []

      case 'serverAnnounced': {
        const known = generation
        generation = event.generation
        if (role !== 'client') return []
        // the first announcement only names the world we are hydrating from; a
        // *different* generation is what means that world is gone
        if (known === null || known === event.generation) return []
        return state === 'SYNCED' ? requestState() : []
      }

      case 'tick':
        if (state !== 'REQUESTING_STATE') return []
        elapsedSinceRequest += event.dt
        if (elapsedSinceRequest < STATE_REQUEST_RETRY_INTERVAL) return []
        elapsedSinceRequest = 0
        return ['requestState']

      case 'stateReceived': {
        if (role === 'server') return []
        const effects: HydrationEffect[] = hydrated ? ['reconcile'] : []
        hydrated = true
        state = 'SYNCED'
        elapsedSinceRequest = 0
        return [...effects, 'markSynced']
      }
    }
  }

  return {
    state: () => state,
    isSynced: () => state === 'SYNCED',
    send
  }
}

/** identifies one run of an authoritative server, so a restart is visible to its clients */
export function newGeneration(): number {
  return Math.floor(Math.random() * 0xffffffff)
}

export function encodeGeneration(generation: number): Uint8Array {
  const payload = new Uint8Array(4)
  new DataView(payload.buffer).setUint32(0, generation)
  return payload
}

export function decodeGeneration(payload: Uint8Array): number {
  if (payload.byteLength < 4) return 0
  return new DataView(payload.buffer, payload.byteOffset, 4).getUint32(0)
}
