import { IEngine, ISchema, Schemas, engine as globalEngine } from '@dcl/ecs'
import { AUTH_SERVER_PEER_ID } from '../message-bus-sync'
import { EventContext, Room, getEventRegistry, getRoom } from './implementation'
import { encodeEvent } from './protocol'

/**
 * Request/response messaging on top of the room's fire-and-forget events.
 *
 * `room.send`/`room.onMessage` have no notion of a reply, so scenes end up hand-rolling
 * correlation: a `requestId` threaded through both payloads, a `requester` field the
 * client filters on, and a retry loop in case the answer never arrives. That boilerplate
 * is easy to get subtly wrong — replies broadcast to every peer instead of the caller,
 * or a request that hangs forever when the handler throws.
 *
 * This layer keeps the same wire mechanism (two registered events per method) but owns
 * the correlation id, the addressing, the timeout, and the error channel.
 *
 * @example
 * ```ts
 * // shared/rpc.ts
 * export const rpc = registerRequests({
 *   loadFarm: { request: Schemas.Map({}), response: FarmStateSchema }
 * })
 *
 * // server
 * rpc.handle('loadFarm', async (_data, context) => farmToPayload(await store.load(context.from)))
 *
 * // client
 * const farm = await rpc.request('loadFarm', {})
 * ```
 */

/** A method's payload shapes: what the caller sends, and what the handler answers with. */
export type RequestDefinition<Req = any, Res = any> = {
  request: ISchema<Req>
  response: ISchema<Res>
}

export type RequestSchemaRegistry = Record<string, RequestDefinition>

export type RequestPayload<T extends RequestSchemaRegistry, K extends keyof T> = T[K]['request'] extends ISchema<
  infer U
>
  ? U
  : never

export type ResponsePayload<T extends RequestSchemaRegistry, K extends keyof T> = T[K]['response'] extends ISchema<
  infer U
>
  ? U
  : never

export type RequestHandler<T extends RequestSchemaRegistry, K extends keyof T> = (
  data: RequestPayload<T, K>,
  context: EventContext
) => ResponsePayload<T, K> | Promise<ResponsePayload<T, K>>

export type RequestOptions = {
  /** Override the registry's default timeout for this call. */
  timeoutMs?: number
  /**
   * Address to ask. **Required** for server-initiated requests — a server request without a
   * target would be broadcast to every client and could be answered by any of them, so it
   * throws instead. Clients always reach the authoritative server and must omit it.
   */
  to?: string
}

export type RequestsOptions = {
  /** Default per-request timeout. Defaults to 20s — a handler may do several ~2s storage round trips. */
  defaultTimeoutMs?: number
}

export type CreateRequestsOptions = RequestsOptions & {
  room: Room
  engine: IEngine
}

export interface Requests<T extends RequestSchemaRegistry> {
  /**
   * Answer `method`. Register it once — a second live handler makes the caller settle
   * on whichever reply lands first.
   *
   * The reply is addressed to the caller automatically. Throw {@link RequestError} to
   * send a message the caller can read; any other throw becomes `internal_error`.
   *
   * @returns an unsubscribe function
   */
  handle<K extends keyof T & string>(method: K, handler: RequestHandler<T, K>): () => void

  /**
   * Call `method` and resolve with the handler's response.
   *
   * Rejects with a {@link RequestError} carrying the handler's message when it failed,
   * or with a {@link RequestTimeoutError} when no reply arrived in time.
   *
   * Custom events are not chunked, so a request or response must fit one comms message
   * (~12KB). An oversized or unserializable payload rejects immediately with
   * `payload_too_large` / `invalid_payload` rather than waiting out the timeout.
   */
  request<K extends keyof T & string>(
    method: K,
    data: RequestPayload<T, K>,
    options?: RequestOptions
  ): Promise<ResponsePayload<T, K>>

  /** Number of in-flight requests. Exposed for diagnostics and tests. */
  pendingCount(): number
}

const DEFAULT_TIMEOUT_MS = 20_000
const INTERNAL_ERROR = 'internal_error'
const TIMEOUT_ERROR = 'request_timeout'
const TOO_LARGE_ERROR = 'payload_too_large'

/**
 * Ceiling for one comms message, mirroring `LIVEKIT_MAX_SIZE` in `network/server`. Custom
 * events are NOT chunked — unlike CRDT traffic — so anything over this is dropped by the
 * transport with no error, which would otherwise surface only as a timeout.
 *
 * Deliberately duplicated rather than imported: keeping this module out of the network
 * transport's import cluster matters more than sharing one number.
 */
const MAX_MESSAGE_BYTES = 12 * 1024
/** Headroom for the event envelope plus the sender address the host prepends on receive. */
const MESSAGE_OVERHEAD_BYTES = 256
const MAX_PAYLOAD_BYTES = MAX_MESSAGE_BYTES - MESSAGE_OVERHEAD_BYTES

/** Event-name prefixes. Namespaced to not collide with scene-registered message names. */
const REQUEST_PREFIX = '@dcl/req:'
const RESPONSE_PREFIX = '@dcl/res:'

/**
 * Error whose message is forwarded verbatim to the caller.
 *
 * Handlers should throw this for failures the caller is meant to see and act on
 * ("insufficient_funds", "plot_locked"). Any *other* throw is reported as
 * `internal_error`, so an unexpected crash cannot leak server internals — stack
 * traces, storage keys, addresses — across the wire.
 */
export class RequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RequestError'
  }
}

/**
 * No reply arrived before the deadline.
 *
 * Distinct from {@link RequestError} on purpose: a timeout is worth retrying, a handler
 * rejection usually is not.
 */
export class RequestTimeoutError extends Error {
  constructor(public readonly method: string) {
    super(`${TIMEOUT_ERROR}: ${method}`)
    this.name = 'RequestTimeoutError'
  }
}

/** Methods whose wire events this module already created, for conflict detection. */
const registeredMethods = new Map<string, RequestDefinition>()

/**
 * Methods with a live handler, per ROOM. Listeners live on the room, so two `Requests`
 * instances bound to the same room would each answer — an instance-scoped guard could not
 * see that, which is exactly the case the warning exists for.
 */
const handledByRoom = new WeakMap<Room, Set<string>>()

function handledMethodsFor(room: Room): Set<string> {
  let handled = handledByRoom.get(room)
  if (!handled) {
    handled = new Set<string>()
    handledByRoom.set(room, handled)
  }
  return handled
}

/**
 * Encode ahead of `room.send` so a payload problem is reported to the caller instead of
 * silently vanishing: `Room.send` catches and logs its own failures, so an unserializable
 * payload would otherwise settle only via the timeout. Also the only place the transport
 * ceiling can be enforced, since nothing downstream checks it for custom events.
 *
 * Costs one extra serialization per message; correctness is worth more here than the bytes.
 */
function checkPayload(eventType: string, data: unknown): string | null {
  let encoded: Uint8Array
  try {
    encoded = encodeEvent(eventType, data as never, getEventRegistry())
  } catch (error) {
    console.error(`[Requests] '${eventType}' payload does not match its schema:`, error)
    return 'invalid_payload'
  }
  if (encoded.byteLength > MAX_PAYLOAD_BYTES) {
    console.error(
      `[Requests] '${eventType}' payload is ${encoded.byteLength} bytes, over the ${MAX_PAYLOAD_BYTES} byte transport limit`
    )
    return TOO_LARGE_ERROR
  }
  return null
}

type PendingRequest = {
  method: string
  /** Expected responder, lowercased. Empty when the caller is a client (only the server answers). */
  expectFrom: string
  deadlineMs: number
  timeoutMs: number
  /**
   * True while `Room` is still holding the request in its send queue. Such an entry has no
   * deadline yet — the clock starts when the room connects and the request actually goes out.
   */
  waitingForRoom: boolean
  resolve: (value: any) => void
  reject: (error: Error) => void
}

/**
 * Bind a request registry to a specific room and engine.
 *
 * Prefer {@link registerRequests} in scenes; this exists for tests and for hosts that
 * run more than one engine in a process.
 */
export function createRequests<T extends RequestSchemaRegistry>(
  definitions: T,
  options: CreateRequestsOptions
): Requests<T> {
  const { room, engine } = options
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS
  const registry = getEventRegistry()

  // Derive and register the two wire events per method. Wrapping the user's schemas
  // instead of introducing an envelope field keeps the existing protocol untouched.
  for (const method of Object.keys(definitions)) {
    const definition = definitions[method]
    const owned = registeredMethods.get(method)
    if (owned) {
      // Re-registering an equivalent pair is a no-op: hosts that run a client and a server
      // engine in one process (tests, tooling) legitimately bind the same definitions to two
      // rooms, and two modules may declare the same method with textually identical schemas.
      // Compared by SHAPE rather than object identity, because `Schemas.Map({...})` mints a
      // fresh object per call. Different shapes under one name is a real conflict.
      if (!sameSchema(owned.request, definition.request) || !sameSchema(owned.response, definition.response)) {
        throw new Error(`Request method '${method}' is already registered with different schemas`)
      }
      continue
    }

    const requestEvent = REQUEST_PREFIX + method
    const responseEvent = RESPONSE_PREFIX + method
    if (registry[requestEvent] || registry[responseEvent]) {
      throw new Error(`Request method '${method}' collides with a registered message name`)
    }

    registry[requestEvent] = Schemas.Map({
      id: Schemas.String,
      body: definition.request
    })
    registry[responseEvent] = Schemas.Map({
      id: Schemas.String,
      ok: Schemas.Boolean,
      error: Schemas.String,
      // Always serialized, even on failure: `Schemas.Optional` drops falsy values, which
      // would silently mangle a legitimate `0` / `false` / `''` response body.
      body: definition.response
    })
    registeredMethods.set(method, definition)
  }

  const pending = new Map<string, PendingRequest>()
  const responseListenersBound = new Set<string>()
  const handledMethods = handledMethodsFor(room)
  const idPrefix = Math.random().toString(36).slice(2, 10)
  let idCounter = 0
  let sweepRegistered = false
  let roomReadySubscribed = false

  function settle(id: string, apply: (entry: PendingRequest) => void): void {
    const entry = pending.get(id)
    if (!entry) return // unknown, duplicate, or already-timed-out id
    pending.delete(id)
    apply(entry)
  }

  /**
   * Deadlines are swept from an engine system, not `setTimeout`: the server runtime does
   * not guarantee timers, and this must behave identically on both sides.
   */
  function ensureSweepSystem(): void {
    if (sweepRegistered) return
    sweepRegistered = true
    engine.addSystem(
      () => {
        if (pending.size === 0) return
        const now = Date.now()
        for (const [id, entry] of [...pending]) {
          // Never time out something that has not been sent: `Room.send` queues while
          // disconnected, so rejecting here would abandon a caller for a request that later
          // leaves the queue and runs on the server anyway.
          if (entry.waitingForRoom) continue
          if (now < entry.deadlineMs) continue
          settle(id, (e) => e.reject(new RequestTimeoutError(e.method)))
        }
      },
      undefined,
      '@dcl/sdk-requests'
    )
  }

  /**
   * `room.send` queues messages until the room connects, so a request issued at boot
   * could burn its whole budget before leaving the process. Re-base those deadlines from
   * the moment the room is actually ready.
   */
  function ensureRoomReadySubscription(): void {
    if (roomReadySubscribed) return
    roomReadySubscribed = true
    room.onReady((isReady) => {
      if (!isReady) return
      const now = Date.now()
      for (const entry of pending.values()) {
        if (!entry.waitingForRoom) continue
        entry.waitingForRoom = false
        entry.deadlineMs = now + entry.timeoutMs
      }
    })
  }

  function bindResponseListener(method: string): void {
    if (responseListenersBound.has(method)) return
    responseListenersBound.add(method)

    room.onMessage(RESPONSE_PREFIX + method, (data: any, context?: EventContext) => {
      const entry = pending.get(data.id)
      if (!entry) return

      // Fail closed. A `context` means we are the server receiving a peer's reply, and a
      // peer may only settle a request that named it: an unset `expectFrom` must never be
      // settleable from the wire. Clients get no context (Room already guarantees the sender
      // is the authoritative server), so their replies are unaffected.
      if (context && (!entry.expectFrom || context.from.toLowerCase() !== entry.expectFrom)) return

      settle(data.id, (e) => {
        if (data.ok) e.resolve(data.body)
        else e.reject(new RequestError(data.error || INTERNAL_ERROR))
      })
    })
  }

  return {
    handle<K extends keyof T & string>(method: K, handler: RequestHandler<T, K>): () => void {
      const responseEvent = RESPONSE_PREFIX + method

      // Two live handlers would each answer, and the caller would settle on whichever
      // reply arrived first — silently discarding the other. Almost always a mistake.
      if (handledMethods.has(method)) {
        console.error(`[Requests] '${method}' already has a handler — the caller will get two replies`)
      }
      handledMethods.add(method)

      const unsubscribe = room.onMessage(REQUEST_PREFIX + method, (data: any, context?: EventContext) => {
        // `context` is absent on clients handling a server-initiated request; the reply
        // then goes to the server, which is the only peer a client can send to.
        const replyTo = context ? { to: [context.from] } : undefined
        const handlerContext: EventContext = context ?? { from: AUTH_SERVER_PEER_ID }

        const reply = (ok: boolean, body: any, error: string) => {
          const payload = { id: data.id, ok, error, body }
          const problem = checkPayload(responseEvent, payload)
          if (!problem) {
            void room.send(responseEvent, payload, replyTo)
            return
          }
          // The intended reply cannot be sent. Answer with the failure instead of nothing, so
          // the caller learns why rather than waiting out its timeout.
          const fallback = { id: data.id, ok: false, error: problem, body: definitions[method].response.create() }
          if (checkPayload(responseEvent, fallback)) return
          void room.send(responseEvent, fallback, replyTo)
        }

        try {
          const result = handler(data.body, handlerContext)
          if (result instanceof Promise) {
            result.then(
              (value) => reply(true, value, ''),
              (error: unknown) => {
                if (!(error instanceof RequestError)) {
                  console.error(`[Requests] handler '${method}' failed:`, error)
                }
                reply(false, definitions[method].response.create(), toWireError(error))
              }
            )
            return
          }
          reply(true, result, '')
        } catch (error) {
          if (!(error instanceof RequestError)) {
            console.error(`[Requests] handler '${method}' threw:`, error)
          }
          reply(false, definitions[method].response.create(), toWireError(error))
        }
      })

      return () => {
        handledMethods.delete(method)
        unsubscribe()
      }
    },

    request<K extends keyof T & string>(
      method: K,
      data: RequestPayload<T, K>,
      options?: RequestOptions
    ): Promise<ResponsePayload<T, K>> {
      ensureSweepSystem()
      ensureRoomReadySubscription()
      bindResponseListener(method)

      const id = `${idPrefix}:${++idCounter}`
      const requestEvent = REQUEST_PREFIX + method
      const problem = checkPayload(requestEvent, { id, body: data })
      if (problem) {
        return Promise.reject(new RequestError(`${problem}: ${method}`))
      }
      const timeoutMs = options?.timeoutMs ?? defaultTimeoutMs
      const waitingForRoom = !room.isReady()

      // Server-initiated requests MUST name a target. Without one, `Room.send` broadcasts the
      // request — and its correlation id — to every client, and any of them could answer.
      // A contract violation, so it throws rather than sending.
      if (room.isServer() && !options?.to) {
        throw new Error(`A server request must name a target: request('${method}', data, { to })`)
      }

      return new Promise<ResponsePayload<T, K>>((resolve, reject) => {
        pending.set(id, {
          method,
          expectFrom: options?.to?.toLowerCase() ?? '',
          // Infinite until the room connects; the onReady rebase sets the real deadline.
          deadlineMs: waitingForRoom ? Number.POSITIVE_INFINITY : Date.now() + timeoutMs,
          timeoutMs,
          waitingForRoom,
          resolve,
          reject
        })

        void room.send(requestEvent, { id, body: data }, options?.to ? { to: [options.to] } : undefined)
      })
    },

    pendingCount(): number {
      return pending.size
    }
  }
}

/** Structural schema comparison — every `ISchema` exposes a serializable `jsonSchema`. */
function sameSchema(a: ISchema, b: ISchema): boolean {
  if (a === b) return true
  try {
    return JSON.stringify(a.jsonSchema) === JSON.stringify(b.jsonSchema)
  } catch {
    return false
  }
}

function toWireError(error: unknown): string {
  return error instanceof RequestError ? error.message || INTERNAL_ERROR : INTERNAL_ERROR
}

/**
 * Register request/response methods for use with the scene room.
 * Call this at module load, like `registerMessages`.
 *
 * @param definitions - `{ methodName: { request: Schema, response: Schema } }`
 * @returns a typed `{ request, handle }` pair for those methods
 */
export function registerRequests<T extends RequestSchemaRegistry>(
  definitions: T,
  options?: RequestsOptions
): Requests<T> {
  return createRequests(definitions, {
    ...options,
    room: getRoom(),
    engine: globalEngine
  })
}
