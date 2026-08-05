/**
 * Unit tests for the hydration state machine. No engines, no comms, no clock:
 * the machine only sees events and only answers with effects, which is the whole
 * point of extracting it out of `message-bus-sync`.
 */
import { AUTH_SERVER_PEER_ID } from '../../../packages/@dcl/sdk/src/network/constants'
import {
  Hydration,
  STATE_REQUEST_RETRY_INTERVAL,
  createHydration,
  decodeGeneration,
  encodeGeneration,
  newGeneration,
  stateResponse
} from '../../../packages/@dcl/sdk/src/network/hydration'

const dump = () => stateResponse(AUTH_SERVER_PEER_ID)

/** a client that asked for the state and is waiting for it */
function requestingClient(): Hydration {
  const hydration = createHydration()
  hydration.send({ type: 'roleResolved', isServer: false })
  expect(hydration.send({ type: 'realmConnected' })).toEqual(['requestState'])
  return hydration
}

function syncedClient(generation = 7): Hydration {
  const hydration = requestingClient()
  hydration.send({ type: 'serverAnnounced', generation })
  expect(hydration.send(dump())).toEqual(['markSynced'])
  return hydration
}

describe('hydration state machine', () => {
  it('starts disconnected, unsynchronized, and ignores everything that is not a connection', () => {
    const hydration = createHydration()

    expect(hydration.state()).toBe('DISCONNECTED')
    expect(hydration.isSynced()).toBe(false)
    expect(hydration.send({ type: 'tick', dt: 60 })).toEqual([])
    expect(hydration.send({ type: 'ownPlayerEntered' })).toEqual([])
    expect(hydration.send({ type: 'realmDisconnected' })).toEqual([])
    expect(hydration.state()).toBe('DISCONNECTED')
  })

  describe('reaching the first hydration', () => {
    it('waits in CONNECTED while the role is unknown, then requests the state as a client', () => {
      const hydration = createHydration()

      expect(hydration.send({ type: 'realmConnected' })).toEqual([])
      expect(hydration.state()).toBe('CONNECTED')

      expect(hydration.send({ type: 'roleResolved', isServer: false })).toEqual(['requestState'])
      expect(hydration.state()).toBe('REQUESTING_STATE')
    })

    it('requests the state when the realm comes up after the role', () => {
      const hydration = createHydration()

      expect(hydration.send({ type: 'roleResolved', isServer: false })).toEqual([])
      expect(hydration.state()).toBe('DISCONNECTED')
      expect(hydration.send({ type: 'realmConnected' })).toEqual(['requestState'])
    })

    it('lets the own player entering the scene drive the request out of CONNECTED', () => {
      const hydration = createHydration()
      hydration.send({ type: 'realmConnected' })

      // still no role: nothing to do yet
      expect(hydration.send({ type: 'ownPlayerEntered' })).toEqual([])

      hydration.send({ type: 'roleResolved', isServer: false })
      // and once requesting, entering the scene again changes nothing
      expect(hydration.send({ type: 'ownPlayerEntered' })).toEqual([])
      expect(hydration.state()).toBe('REQUESTING_STATE')
    })

    it('applies a state dump without reconciling anything on a first join', () => {
      const hydration = requestingClient()

      expect(hydration.send(dump())).toEqual(['markSynced'])
      expect(hydration.state()).toBe('SYNCED')
      expect(hydration.isSynced()).toBe(true)
    })

    it('reconciles every dump after the first one', () => {
      const hydration = syncedClient()

      expect(hydration.send(dump())).toEqual(['reconcile', 'markSynced'])
    })
  })

  describe('the server short-circuit', () => {
    it('is synchronized and announces itself as soon as its role is known', () => {
      const hydration = createHydration()

      expect(hydration.send({ type: 'roleResolved', isServer: true })).toEqual(['markSynced', 'announce'])
      expect(hydration.state()).toBe('SYNCED')
      expect(hydration.isSynced()).toBe(true)
    })

    it('does not announce twice when the realm comes up afterwards', () => {
      const hydration = createHydration()
      hydration.send({ type: 'roleResolved', isServer: true })

      expect(hydration.send({ type: 'realmConnected' })).toEqual([])
    })

    it('announces once when the role lands after the realm', () => {
      const hydration = createHydration()
      hydration.send({ type: 'realmConnected' })

      expect(hydration.send({ type: 'roleResolved', isServer: true })).toEqual(['markSynced', 'announce'])
    })

    it('stays synchronized across a disconnect, and never hydrates from anyone', () => {
      const hydration = createHydration()
      hydration.send({ type: 'roleResolved', isServer: true })

      expect(hydration.send({ type: 'realmDisconnected' })).toEqual([])
      expect(hydration.state()).toBe('SYNCED')
      expect(hydration.send(dump())).toEqual([])
      expect(hydration.send({ type: 'serverAnnounced', generation: 99 })).toEqual([])
      expect(hydration.state()).toBe('SYNCED')
    })
  })

  describe('the retry timer', () => {
    it('re-requests once the accumulated dt reaches the interval, then starts over', () => {
      const hydration = requestingClient()
      const step = STATE_REQUEST_RETRY_INTERVAL / 4

      expect(hydration.send({ type: 'tick', dt: step })).toEqual([])
      expect(hydration.send({ type: 'tick', dt: step })).toEqual([])
      expect(hydration.send({ type: 'tick', dt: step })).toEqual([])
      expect(hydration.send({ type: 'tick', dt: step })).toEqual(['requestState'])

      expect(hydration.send({ type: 'tick', dt: step })).toEqual([])
      expect(hydration.send({ type: 'tick', dt: STATE_REQUEST_RETRY_INTERVAL })).toEqual(['requestState'])
    })

    it('does not run outside REQUESTING_STATE', () => {
      const disconnected = createHydration()
      expect(disconnected.send({ type: 'tick', dt: STATE_REQUEST_RETRY_INTERVAL * 3 })).toEqual([])

      const connected = createHydration()
      connected.send({ type: 'realmConnected' })
      expect(connected.send({ type: 'tick', dt: STATE_REQUEST_RETRY_INTERVAL * 3 })).toEqual([])

      const synced = syncedClient()
      expect(synced.send({ type: 'tick', dt: STATE_REQUEST_RETRY_INTERVAL * 3 })).toEqual([])
    })

    it('restarts from zero once the dump lands', () => {
      const hydration = requestingClient()
      hydration.send({ type: 'tick', dt: STATE_REQUEST_RETRY_INTERVAL * 0.9 })
      hydration.send(dump())

      // back to requesting: the leftover 0.9 must not carry over into the new wait
      hydration.send({ type: 'realmDisconnected' })
      hydration.send({ type: 'realmConnected' })
      expect(hydration.send({ type: 'tick', dt: STATE_REQUEST_RETRY_INTERVAL * 0.9 })).toEqual([])
    })
  })

  describe('a reply from anyone but the authoritative server', () => {
    it('cannot be turned into an event at all', () => {
      expect(stateResponse('clientB')).toBeNull()
      expect(stateResponse('')).toBeNull()
      expect(stateResponse(AUTH_SERVER_PEER_ID)?.type).toBe('stateReceived')
    })

    it('is not representable as one either', () => {
      const hydration = requestingClient()

      // @ts-expect-error only stateResponse() can mint a stateReceived event
      hydration.send({ type: 'stateReceived' })
    })

    it('leaves the retry timer exactly where it was', () => {
      const hydration = requestingClient()
      hydration.send({ type: 'tick', dt: STATE_REQUEST_RETRY_INTERVAL * 0.75 })

      expect(hydration.send(stateResponse('clientB'))).toEqual([])
      expect(hydration.state()).toBe('REQUESTING_STATE')
      expect(hydration.isSynced()).toBe(false)

      // the timer kept counting from 0.75, so a quarter of the interval is enough
      expect(hydration.send({ type: 'tick', dt: STATE_REQUEST_RETRY_INTERVAL * 0.25 })).toEqual(['requestState'])
    })
  })

  describe('reconnecting', () => {
    it('drops back to DISCONNECTED and re-requests on the way back', () => {
      const hydration = syncedClient()

      expect(hydration.send({ type: 'realmDisconnected' })).toEqual([])
      expect(hydration.state()).toBe('DISCONNECTED')
      expect(hydration.isSynced()).toBe(false)

      expect(hydration.send({ type: 'realmConnected' })).toEqual(['requestState'])
    })

    it('remembers it has hydrated before, so the dump it comes back to is reconciled', () => {
      const hydration = syncedClient()
      hydration.send({ type: 'realmDisconnected' })
      hydration.send({ type: 'realmConnected' })

      expect(hydration.send(dump())).toEqual(['reconcile', 'markSynced'])
    })

    it('ignores a disconnect it is already in, and a connect it is already out of', () => {
      const hydration = requestingClient()

      expect(hydration.send({ type: 'realmConnected' })).toEqual([])
      expect(hydration.state()).toBe('REQUESTING_STATE')

      hydration.send({ type: 'realmDisconnected' })
      expect(hydration.send({ type: 'realmDisconnected' })).toEqual([])
      expect(hydration.state()).toBe('DISCONNECTED')
    })
  })

  describe('server generations', () => {
    it('records the first announcement without re-hydrating', () => {
      const hydration = requestingClient()

      expect(hydration.send({ type: 'serverAnnounced', generation: 1 })).toEqual([])
      expect(hydration.state()).toBe('REQUESTING_STATE')
    })

    it('ignores an announcement repeating the generation it hydrated from', () => {
      const hydration = syncedClient(3)

      expect(hydration.send({ type: 'serverAnnounced', generation: 3 })).toEqual([])
      expect(hydration.state()).toBe('SYNCED')
    })

    it('re-enters REQUESTING_STATE when a synced client sees a new generation', () => {
      const hydration = syncedClient(3)

      expect(hydration.send({ type: 'serverAnnounced', generation: 4 })).toEqual(['requestState'])
      expect(hydration.state()).toBe('REQUESTING_STATE')
      expect(hydration.isSynced()).toBe(false)
    })

    it('takes the new generation quietly when it is still hydrating or offline', () => {
      const midHydration = requestingClient()
      midHydration.send({ type: 'serverAnnounced', generation: 3 })
      expect(midHydration.send({ type: 'serverAnnounced', generation: 4 })).toEqual([])
      expect(midHydration.state()).toBe('REQUESTING_STATE')
      // and the dump it was already waiting for still counts
      expect(midHydration.send(dump())).toEqual(['markSynced'])

      const offline = syncedClient(3)
      offline.send({ type: 'realmDisconnected' })
      expect(offline.send({ type: 'serverAnnounced', generation: 4 })).toEqual([])
      expect(offline.state()).toBe('DISCONNECTED')
    })
  })

  describe('the generation payload', () => {
    it('round-trips through 4 bytes', () => {
      for (const generation of [0, 1, 0xdeadbeef, 0xffffffff]) {
        const encoded = encodeGeneration(generation)
        expect(encoded.byteLength).toBe(4)
        expect(decodeGeneration(encoded)).toBe(generation)
      }
    })

    it('survives a payload that is not one, and mints values inside the encodable range', () => {
      expect(decodeGeneration(new Uint8Array())).toBe(0)
      expect(decodeGeneration(new Uint8Array([1, 2]))).toBe(0)

      for (let i = 0; i < 50; i++) {
        const generation = newGeneration()
        expect(decodeGeneration(encodeGeneration(generation))).toBe(generation)
      }
    })
  })
})
