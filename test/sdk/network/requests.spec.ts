import { Engine, IEngine, Schemas } from '../../../packages/@dcl/ecs/dist'
import { Atom } from '../../../packages/@dcl/sdk/src/atom'
import { CommsMessage } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import { Room } from '../../../packages/@dcl/sdk/src/network/events/implementation'
import {
  RequestError,
  RequestTimeoutError,
  Requests,
  createRequests
} from '../../../packages/@dcl/sdk/src/network/events/requests'

const CLIENT_ADDRESS = '0xclient'
const AUTH_SERVER_PEER_ID = 'authoritative-server'

// Schemas are registered process-wide by design (same contract as `registerMessages`),
// so the definitions live at module scope: re-binding the *same* schema objects to a
// second room is the supported path, re-binding different ones is an error.
const DEFINITIONS = {
  loadProfile: {
    request: Schemas.Map({ includeStats: Schemas.Boolean }),
    response: Schemas.Map({ name: Schemas.String, gold: Schemas.Int })
  },
  countCoins: {
    request: Schemas.Map({}),
    response: Schemas.Int
  },
  buySeed: {
    request: Schemas.Map({ cropType: Schemas.Int }),
    response: Schemas.Map({ coins: Schemas.Int })
  },
  unanswered: {
    request: Schemas.Map({}),
    response: Schemas.Map({ ok: Schemas.Boolean })
  },
  loadBlob: {
    request: Schemas.Map({ size: Schemas.Int }),
    response: Schemas.Map({ blob: Schemas.String })
  },
  echoText: {
    request: Schemas.Map({ text: Schemas.String }),
    response: Schemas.Map({ text: Schemas.String })
  }
}

type BusCallback = (data: Uint8Array, sender: string) => void

/** Wire a client room and a server room together with the platform's addressing rules. */
function createLinkedRooms(engine: IEngine, options: { clientReady?: boolean } = {}) {
  let clientReceive: BusCallback | undefined
  let serverReceive: BusCallback | undefined
  const serverSendTargets: (string[] | undefined)[] = []
  const serverSent: Uint8Array[] = []
  const clientReadyAtom = Atom<boolean>(options.clientReady ?? true)

  const clientBus = {
    on: (_message: CommsMessage, callback: BusCallback) => {
      clientReceive = callback
    },
    // A client can only ever reach the authoritative server.
    emit: (_message: CommsMessage, data: Uint8Array) => serverReceive?.(data, CLIENT_ADDRESS)
  }

  const serverBus = {
    on: (_message: CommsMessage, callback: BusCallback) => {
      serverReceive = callback
    },
    emit: (_message: CommsMessage, data: Uint8Array, to?: string[]) => {
      serverSendTargets.push(to)
      serverSent.push(data)
      if (!to || to.includes(CLIENT_ADDRESS)) clientReceive?.(data, AUTH_SERVER_PEER_ID)
    }
  }

  return {
    clientRoom: new Room(engine, clientBus, Atom<boolean>(false), clientReadyAtom),
    serverRoom: new Room(engine, serverBus, Atom<boolean>(true), Atom<boolean>(true)),
    serverSendTargets,
    clientReadyAtom,
    /** Hand a buffer the server addressed elsewhere straight to the client. */
    deliverToClient: (data: Uint8Array) => clientReceive?.(data, AUTH_SERVER_PEER_ID),
    /** Deliver the client's last outbound buffer to the server as if another peer sent it. */
    deliverToServerAs: (data: Uint8Array, sender: string) => serverReceive?.(data, sender),
    serverSent
  }
}

/**
 * Drain the microtask hops between `send` and a handler running: the send path awaits
 * the room's `isServer` future, and delivery awaits it again per listener. Everything is
 * microtasks (no timers), so yielding repeatedly is enough.
 */
async function flush(): Promise<void> {
  for (let i = 0; i < 25; i++) await Promise.resolve()
}

describe('Room requests', () => {
  let engine: IEngine
  let clientRpc: Requests<typeof DEFINITIONS>
  let serverRpc: Requests<typeof DEFINITIONS>
  let serverSendTargets: (string[] | undefined)[]

  beforeEach(() => {
    engine = Engine()
    const link = createLinkedRooms(engine)
    serverSendTargets = link.serverSendTargets
    clientRpc = createRequests(DEFINITIONS, { room: link.clientRoom, engine })
    serverRpc = createRequests(DEFINITIONS, { room: link.serverRoom, engine })
  })

  describe('when the server handles a request', () => {
    let response: { name: string; gold: number }
    let receivedRequest: { includeStats: boolean } | undefined
    let receivedFrom: string | undefined

    beforeEach(async () => {
      serverRpc.handle('loadProfile', (data, context) => {
        receivedRequest = data
        receivedFrom = context.from
        return { name: 'Ada', gold: 42 }
      })
      const pending = clientRpc.request('loadProfile', { includeStats: true })
      await flush()
      response = await pending
    })

    it('should resolve with the handler response', () => {
      expect(response).toEqual({ name: 'Ada', gold: 42 })
    })

    it('should pass the request payload to the handler', () => {
      expect(receivedRequest).toEqual({ includeStats: true })
    })

    it('should give the handler the caller address', () => {
      expect(receivedFrom).toBe(CLIENT_ADDRESS)
    })

    it('should address the reply to the caller only', () => {
      expect(serverSendTargets).toEqual([[CLIENT_ADDRESS]])
    })

    it('should leave no request pending', () => {
      expect(clientRpc.pendingCount()).toBe(0)
    })
  })

  describe('when the handler is asynchronous', () => {
    let response: { coins: number }

    beforeEach(async () => {
      serverRpc.handle('buySeed', async (data) => {
        await Promise.resolve()
        return { coins: 100 - data.cropType }
      })
      const pending = clientRpc.request('buySeed', { cropType: 7 })
      await flush()
      response = await pending
    })

    it('should resolve with the awaited response', () => {
      expect(response).toEqual({ coins: 93 })
    })
  })

  describe('when the response body is a falsy scalar', () => {
    let response: number

    beforeEach(async () => {
      serverRpc.handle('countCoins', () => 0)
      const pending = clientRpc.request('countCoins', {})
      await flush()
      response = await pending
    })

    it('should resolve with the zero value rather than a default', () => {
      expect(response).toBe(0)
    })
  })

  describe('when the handler throws a RequestError', () => {
    let error: Error | undefined

    beforeEach(async () => {
      serverRpc.handle('buySeed', () => {
        throw new RequestError('insufficient_funds')
      })
      const pending = clientRpc.request('buySeed', { cropType: 1 }).catch((caught: Error) => {
        error = caught
      })
      await flush()
      await pending
    })

    it('should reject with the handler message', () => {
      expect(error?.message).toBe('insufficient_funds')
    })
  })

  describe('when the handler throws an unexpected error', () => {
    let error: Error | undefined
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(async () => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      serverRpc.handle('buySeed', () => {
        throw new Error('storage key farm_v1 unreachable')
      })
      const pending = clientRpc.request('buySeed', { cropType: 1 }).catch((caught: Error) => {
        error = caught
      })
      await flush()
      await pending
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should reject with a generic error instead of the internal message', () => {
      expect(error?.message).toBe('internal_error')
    })

    it('should log the original failure on the server', () => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Requests] handler 'buySeed' threw:", expect.any(Error))
    })
  })

  describe('when no handler answers the request', () => {
    let error: Error | undefined

    beforeEach(async () => {
      const pending = clientRpc.request('unanswered', {}, { timeoutMs: 0 }).catch((caught: Error) => {
        error = caught
      })
      await flush()
      await engine.update(1)
      await pending
    })

    it('should reject with a timeout naming the method', () => {
      expect(error?.message).toBe('request_timeout: unanswered')
    })

    it('should reject with a RequestTimeoutError so callers can retry selectively', () => {
      expect(error).toBeInstanceOf(RequestTimeoutError)
    })

    it('should drop the pending entry', () => {
      expect(clientRpc.pendingCount()).toBe(0)
    })
  })

  describe('when several requests are in flight at once', () => {
    let responses: { coins: number }[]

    beforeEach(async () => {
      serverRpc.handle('buySeed', async (data) => {
        // Answer out of order so a correlation bug cannot pass by luck.
        if (data.cropType === 1) await flush()
        return { coins: data.cropType * 10 }
      })
      const pending = [
        clientRpc.request('buySeed', { cropType: 1 }),
        clientRpc.request('buySeed', { cropType: 2 }),
        clientRpc.request('buySeed', { cropType: 3 })
      ]
      await flush()
      responses = await Promise.all(pending)
    })

    it('should resolve each caller with its own response', () => {
      expect(responses).toEqual([{ coins: 10 }, { coins: 20 }, { coins: 30 }])
    })
  })

  describe('when a method name is registered with different schemas', () => {
    let register: () => void

    beforeEach(() => {
      const link = createLinkedRooms(engine)
      register = () =>
        createRequests(
          { loadProfile: { request: Schemas.Map({ other: Schemas.String }), response: Schemas.Int } },
          { room: link.clientRoom, engine }
        )
    })

    it('should throw a conflict error', () => {
      expect(register).toThrow("Request method 'loadProfile' is already registered with different schemas")
    })
  })

  describe('when a request is issued before the room is connected', () => {
    let engineB: IEngine
    let link: ReturnType<typeof createLinkedRooms>
    let clientB: Requests<typeof DEFINITIONS>
    let serverB: Requests<typeof DEFINITIONS>
    let settled: string
    let handlerCalls: number

    beforeEach(async () => {
      engineB = Engine()
      settled = 'pending'
      handlerCalls = 0
      link = createLinkedRooms(engineB, { clientReady: false })
      clientB = createRequests(DEFINITIONS, { room: link.clientRoom, engine: engineB })
      serverB = createRequests(DEFINITIONS, { room: link.serverRoom, engine: engineB })
      serverB.handle('buySeed', (data) => {
        handlerCalls++
        return { coins: data.cropType }
      })
      void clientB.request('buySeed', { cropType: 5 }, { timeoutMs: 0 }).then(
        () => (settled = 'resolved'),
        (error: Error) => (settled = `rejected:${error.message}`)
      )
      // Ticks well past the deadline while the room is still disconnected.
      await engineB.update(1)
      await engineB.update(1)
      await flush()
    })

    it('should not time out while the request is still queued', () => {
      expect(settled).toBe('pending')
    })

    it('should not have reached the handler yet', () => {
      expect(handlerCalls).toBe(0)
    })

    describe('and the room then connects', () => {
      beforeEach(async () => {
        link.clientReadyAtom.swap(true)
        await flush()
      })

      it('should resolve the original caller', () => {
        expect(settled).toBe('resolved')
      })

      it('should have run the handler exactly once', () => {
        expect(handlerCalls).toBe(1)
      })
    })
  })

  describe('when a server request omits its target', () => {
    let attempt: () => void

    beforeEach(() => {
      attempt = () => serverRpc.request('buySeed', { cropType: 1 })
    })

    it('should throw rather than broadcast the request', () => {
      expect(attempt).toThrow("A server request must name a target: request('buySeed', data, { to })")
    })

    it('should not have sent anything', () => {
      try {
        attempt()
      } catch {
        // expected
      }

      expect(serverSendTargets).toEqual([])
    })
  })

  describe('when a peer answers a server request addressed to somebody else', () => {
    let error: Error | undefined
    let link: ReturnType<typeof createLinkedRooms>
    let engineB: IEngine
    let clientB: Requests<typeof DEFINITIONS>
    let serverB: Requests<typeof DEFINITIONS>

    beforeEach(async () => {
      error = undefined
      engineB = Engine()
      link = createLinkedRooms(engineB)
      clientB = createRequests(DEFINITIONS, { room: link.clientRoom, engine: engineB })
      serverB = createRequests(DEFINITIONS, { room: link.serverRoom, engine: engineB })
      // The client will happily answer anything it is handed.
      clientB.handle('buySeed', () => ({ coins: 999 }))
      const pending = serverB
        .request('buySeed', { cropType: 1 }, { to: '0xsomebodyelse', timeoutMs: 0 })
        .catch((caught: Error) => {
          error = caught
        })
      await flush()
      // Hand the request to the client even though it was addressed elsewhere, so it replies.
      link.deliverToClient(link.serverSent[link.serverSent.length - 1])
      await flush()
      await engineB.update(1)
      await pending
    })

    it('should ignore the reply and time out instead', () => {
      expect(error).toBeInstanceOf(RequestTimeoutError)
    })
  })

  describe('when a response exceeds the transport ceiling', () => {
    let error: Error | undefined
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(async () => {
      error = undefined
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      serverRpc.handle('loadBlob', (data) => ({ blob: 'x'.repeat(data.size) }))
      const pending = clientRpc.request('loadBlob', { size: 20_000 }).catch((caught: Error) => {
        error = caught
      })
      await flush()
      await pending
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should reject with a size error rather than timing out', () => {
      expect(error?.message).toBe('payload_too_large')
    })

    it('should not be reported as a timeout', () => {
      expect(error).not.toBeInstanceOf(RequestTimeoutError)
    })
  })

  describe('when a request payload cannot be serialized', () => {
    let error: Error | undefined
    let consoleErrorSpy: jest.SpyInstance
    let handlerCalls: number

    beforeEach(async () => {
      error = undefined
      handlerCalls = 0
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      serverRpc.handle('echoText', (data) => {
        handlerCalls++
        return data
      })
      const pending = clientRpc.request('echoText', { text: undefined } as never).catch((caught: Error) => {
        error = caught
      })
      await flush()
      await pending
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should reject with an invalid-payload error', () => {
      expect(error?.message).toBe('invalid_payload: echoText')
    })

    it('should not be reported as a timeout', () => {
      expect(error).not.toBeInstanceOf(RequestTimeoutError)
    })

    it('should never reach the handler', () => {
      expect(handlerCalls).toBe(0)
    })
  })

  describe('when two Requests instances bound to one room handle the same method', () => {
    let consoleErrorSpy: jest.SpyInstance
    let second: Requests<typeof DEFINITIONS>
    let engineB: IEngine
    let link: ReturnType<typeof createLinkedRooms>

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      engineB = Engine()
      link = createLinkedRooms(engineB)
      const first = createRequests(DEFINITIONS, { room: link.serverRoom, engine: engineB })
      second = createRequests(DEFINITIONS, { room: link.serverRoom, engine: engineB })
      first.handle('buySeed', () => ({ coins: 1 }))
      second.handle('buySeed', () => ({ coins: 2 }))
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should warn that the caller will get two replies', () => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Requests] 'buySeed' already has a handler — the caller will get two replies"
      )
    })
  })

  describe('when the same method is declared twice with structurally identical schemas', () => {
    let register: () => void

    beforeEach(() => {
      const link = createLinkedRooms(engine)
      register = () =>
        createRequests(
          {
            countCoins: {
              request: Schemas.Map({}),
              response: Schemas.Int
            }
          },
          { room: link.clientRoom, engine }
        )
    })

    it('should accept the re-declaration', () => {
      expect(register).not.toThrow()
    })
  })
})
