import { Engine, IEngine, components, ExplorerUi, PBExplorerUiEventsResult } from '../../../packages/@dcl/ecs/src'
import { AppendValueOperation } from '../../../packages/@dcl/ecs/src/serialization/crdt/appendValue'
import { DeleteEntity } from '../../../packages/@dcl/ecs/src/serialization/crdt/deleteEntity'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { Transport } from '../../../packages/@dcl/ecs/src/systems/crdt/types'
// Type-only: erased at runtime, so it does not evaluate the `~system` mock
// factory before `mockOpenExplorerUi` is initialized.
import type { OpenExplorerUiAndWaitCloseResult } from '../../../packages/@dcl/sdk/src/explorer-ui'

// The helper imports from `~system/RestrictedActions`, which jest cannot
// resolve on its own; this virtual mock provides the module and the enum values.
const mockOpenExplorerUi = jest.fn()

jest.mock(
  '~system/RestrictedActions',
  () => ({
    openExplorerUi: mockOpenExplorerUi,
    OpenExplorerUiResult: {
      UNSPECIFIED: 0,
      OPENED: 1,
      WAS_ALREADY_OPEN: 2,
      REJECTED_NOT_CURRENT_SCENE: 3,
      REJECTED_FEATURE_DISABLED: 4,
      REJECTED_NO_USER_GESTURE: 5,
      UNRECOGNIZED: -1
    }
  }),
  { virtual: true }
)

// Imported lazily so the helper resolves `~system/RestrictedActions` against the mock above.
let createOpenExplorerUiAndWaitClose: typeof import('../../../packages/@dcl/sdk/src/explorer-ui').createOpenExplorerUiAndWaitClose
let EXPLORER_UI_WAIT_CLOSE_TIMEOUT_SYSTEM: string
let OpenExplorerUiResult: typeof import('~system/RestrictedActions').OpenExplorerUiResult

beforeAll(async () => {
  const mod = await import('../../../packages/@dcl/sdk/src/explorer-ui')
  createOpenExplorerUiAndWaitClose = mod.createOpenExplorerUiAndWaitClose
  EXPLORER_UI_WAIT_CLOSE_TIMEOUT_SYSTEM = mod.EXPLORER_UI_WAIT_CLOSE_TIMEOUT_SYSTEM
  OpenExplorerUiResult = mod.OpenExplorerUiResult
})

type OpenExplorerUiResultType = import('~system/RestrictedActions').OpenExplorerUiResult
type OpenFn = (request: { ui: ExplorerUi }) => Promise<{ openResult: OpenExplorerUiResultType }>

/** Lets queued microtasks run: the RPC continuation and the waiter registration. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

describe('openExplorerUiAndWaitClose', () => {
  let engine: IEngine
  let ExplorerUiEventsResult: ReturnType<typeof components.ExplorerUiEventsResult>
  let transport: Transport

  function makeHelper(openFn: OpenFn) {
    return createOpenExplorerUiAndWaitClose(engine, ExplorerUiEventsResult, openFn).openExplorerUiAndWaitClose
  }

  /** Feed a renderer -> scene APPEND_VALUE for the event, then process it. */
  async function injectEvent(event: PBExplorerUiEventsResult) {
    const body = new ReadWriteByteBuffer()
    ExplorerUiEventsResult.schema.serialize(event, body)
    const message = new ReadWriteByteBuffer()
    AppendValueOperation.write(
      engine.RootEntity,
      event.timestamp,
      ExplorerUiEventsResult.componentId,
      body.toBinary(),
      message
    )
    transport.onmessage!(message.toBinary())
    await engine.update(0)
  }

  const opened = (ui: ExplorerUi, timestamp: number): PBExplorerUiEventsResult => ({
    ui,
    timestamp,
    event: { $case: 'opened', opened: {} }
  })
  const closed = (ui: ExplorerUi, timestamp: number): PBExplorerUiEventsResult => ({
    ui,
    timestamp,
    event: { $case: 'closed', closed: {} }
  })

  // The engine has no getSystems; removeSystem returns false when the system
  // is absent. Only call where absence is expected — a true return removes it.
  function timeoutSystemAbsent() {
    return engine.removeSystem(EXPLORER_UI_WAIT_CLOSE_TIMEOUT_SYSTEM) === false
  }

  beforeEach(() => {
    engine = Engine()
    ExplorerUiEventsResult = components.ExplorerUiEventsResult(engine)
    transport = { send: async () => {}, filter: () => true }
    engine.addTransport(transport)
    mockOpenExplorerUi.mockReset()
  })

  it('resolves immediately for non-OPENED verdicts without arming dispatcher or timeout system', async () => {
    for (const verdict of [
      OpenExplorerUiResult.WAS_ALREADY_OPEN,
      OpenExplorerUiResult.REJECTED_NOT_CURRENT_SCENE,
      OpenExplorerUiResult.REJECTED_FEATURE_DISABLED,
      OpenExplorerUiResult.REJECTED_NO_USER_GESTURE
    ]) {
      const openFn: OpenFn = jest.fn().mockResolvedValue({ openResult: verdict })
      const openExplorerUiAndWaitClose = makeHelper(openFn)

      const result = await openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_MAP }, { timeoutMs: 1000 })

      expect(result).toEqual({ openResult: verdict, timedOut: false })
      expect(result.closed).toBeUndefined()
      expect(timeoutSystemAbsent()).toBe(true)
    }
  })

  it('OPENED then opened + closed (incoming CRDT path) resolves with the closed event and removes the waiter', async () => {
    const openFn: OpenFn = jest.fn().mockResolvedValue({ openResult: OpenExplorerUiResult.OPENED })
    const openExplorerUiAndWaitClose = makeHelper(openFn)

    const promise = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_BACKPACK })
    await flush()

    await injectEvent(opened(ExplorerUi.EU_BACKPACK, 10))
    await injectEvent(closed(ExplorerUi.EU_BACKPACK, 11))

    const result = await promise
    expect(result.openResult).toBe(OpenExplorerUiResult.OPENED)
    expect(result.timedOut).toBe(false)
    expect(result.closed).toEqual(closed(ExplorerUi.EU_BACKPACK, 11))

    // Waiter removed: a further closed for the same ui must not resolve anything new.
    await injectEvent(opened(ExplorerUi.EU_BACKPACK, 20))
    await injectEvent(closed(ExplorerUi.EU_BACKPACK, 21))
    // (nothing to assert beyond "no throw / promise already settled")
  })

  it('resolves timed-out when timeoutMs elapses with no close, and removes the timeout system afterwards', async () => {
    const openFn: OpenFn = jest.fn().mockResolvedValue({ openResult: OpenExplorerUiResult.OPENED })
    const openExplorerUiAndWaitClose = makeHelper(openFn)

    let settled: OpenExplorerUiAndWaitCloseResult | undefined
    const promise = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_SETTINGS }, { timeoutMs: 1000 }).then((r) => {
      settled = r
      return r
    })
    await flush()

    // The armed timeout system is the only thing that can resolve this promise.
    await engine.update(0.5) // 500ms accumulated
    expect(settled).toBeUndefined()

    await engine.update(0.6) // 1100ms accumulated -> fires
    const result = await promise

    expect(result).toEqual({ openResult: OpenExplorerUiResult.OPENED, closed: undefined, timedOut: true })
    // The system removed itself once no timed waiters remained.
    expect(timeoutSystemAbsent()).toBe(true)
  })

  it('ignores stale / out-of-session closed events and resolves on the correct session close', async () => {
    // Pre-existing OLD-session events already accumulated before this call.
    await injectEvent(opened(ExplorerUi.EU_MAP, 1))
    await injectEvent(closed(ExplorerUi.EU_MAP, 2))

    const openFn: OpenFn = jest.fn().mockResolvedValue({ openResult: OpenExplorerUiResult.OPENED })
    const openExplorerUiAndWaitClose = makeHelper(openFn)

    let settled = false
    const promise = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_MAP }).then((r) => {
      settled = true
      return r
    })
    await flush() // snapshot captured at maxTimestamp = 2

    // A closed with timestamp > snapshot but arriving BEFORE our opened must not resolve (unanchored).
    await injectEvent(closed(ExplorerUi.EU_MAP, 3))
    expect(settled).toBe(false)

    // Our session opens.
    await injectEvent(opened(ExplorerUi.EU_MAP, 5))
    // A closed BEFORE our anchor is ignored.
    await injectEvent(closed(ExplorerUi.EU_MAP, 4))
    expect(settled).toBe(false)

    // The matching close at/after the anchor resolves us.
    await injectEvent(closed(ExplorerUi.EU_MAP, 6))
    const result = await promise
    expect(result.closed).toEqual(closed(ExplorerUi.EU_MAP, 6))
  })

  it('recovers events that arrived before the waiter was registered via the snapshot scan', async () => {
    const rpc = deferred<{ openResult: OpenExplorerUiResultType }>()
    const openFn: OpenFn = jest.fn().mockReturnValue(rpc.promise)
    const openExplorerUiAndWaitClose = makeHelper(openFn)

    // Call starts, snapshot captured (-1, empty set), but the RPC has NOT resolved yet.
    const promise = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_PLACES })
    await flush()

    // opened + closed land while the RPC is in flight — no waiter exists yet,
    // so they only survive in the accumulated set.
    await injectEvent(opened(ExplorerUi.EU_PLACES, 10))
    await injectEvent(closed(ExplorerUi.EU_PLACES, 11))

    // The waiter registers late; the replay scan must recover both events.
    rpc.resolve({ openResult: OpenExplorerUiResult.OPENED })
    const result = await promise
    expect(result.closed).toEqual(closed(ExplorerUi.EU_PLACES, 11))
    expect(timeoutSystemAbsent()).toBe(true)
  })

  it('handles two sequential sessions for the same ui, each resolving with its own close', async () => {
    const openFn: OpenFn = jest.fn().mockResolvedValue({ openResult: OpenExplorerUiResult.OPENED })
    const openExplorerUiAndWaitClose = makeHelper(openFn)

    const first = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_EVENTS })
    await flush()
    await injectEvent(opened(ExplorerUi.EU_EVENTS, 1))
    await injectEvent(closed(ExplorerUi.EU_EVENTS, 2))
    expect((await first).closed).toEqual(closed(ExplorerUi.EU_EVENTS, 2))

    const second = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_EVENTS })
    await flush()
    await injectEvent(opened(ExplorerUi.EU_EVENTS, 3))
    await injectEvent(closed(ExplorerUi.EU_EVENTS, 4))
    expect((await second).closed).toEqual(closed(ExplorerUi.EU_EVENTS, 4))
  })

  it('routes concurrent same-ui waiters in FIFO order (oldest opened anchors oldest waiter)', async () => {
    const openFn: OpenFn = jest.fn().mockResolvedValue({ openResult: OpenExplorerUiResult.OPENED })
    const openExplorerUiAndWaitClose = makeHelper(openFn)

    const w1 = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_COMMUNITIES })
    const w2 = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_COMMUNITIES })
    await flush()

    await injectEvent(opened(ExplorerUi.EU_COMMUNITIES, 10)) // anchors w1
    await injectEvent(opened(ExplorerUi.EU_COMMUNITIES, 11)) // anchors w2
    await injectEvent(closed(ExplorerUi.EU_COMMUNITIES, 12)) // resolves w1
    await injectEvent(closed(ExplorerUi.EU_COMMUNITIES, 13)) // resolves w2

    expect((await w1).closed).toEqual(closed(ExplorerUi.EU_COMMUNITIES, 12))
    expect((await w2).closed).toEqual(closed(ExplorerUi.EU_COMMUNITIES, 13))
  })

  it('does not let a late-arming waiter replay-consume a session already settled via onChange', async () => {
    const rpc1 = deferred<{ openResult: OpenExplorerUiResultType }>()
    const rpc2 = deferred<{ openResult: OpenExplorerUiResultType }>()
    const openFn: OpenFn = jest.fn().mockReturnValueOnce(rpc1.promise).mockReturnValueOnce(rpc2.promise)
    const openExplorerUiAndWaitClose = makeHelper(openFn)

    // Both calls issued before any event: both snapshots are -1.
    const w1 = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_MAP })
    let w2settled: OpenExplorerUiAndWaitCloseResult | undefined
    const w2 = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_MAP }).then((r) => {
      w2settled = r
      return r
    })

    // w1 arms and settles entirely through onChange while w2's RPC is in flight.
    rpc1.resolve({ openResult: OpenExplorerUiResult.OPENED })
    await flush()
    await injectEvent(opened(ExplorerUi.EU_MAP, 10))
    await injectEvent(closed(ExplorerUi.EU_MAP, 11))
    expect((await w1).closed).toEqual(closed(ExplorerUi.EU_MAP, 11))

    // w2 arms late; its replay must skip the consumed 10/11 pair.
    rpc2.resolve({ openResult: OpenExplorerUiResult.OPENED })
    await flush()
    expect(w2settled).toBeUndefined()

    await injectEvent(opened(ExplorerUi.EU_MAP, 12))
    await injectEvent(closed(ExplorerUi.EU_MAP, 13))
    expect((await w2).closed).toEqual(closed(ExplorerUi.EU_MAP, 13))
  })

  it('swallows the orphaned opened of a waiter that timed out unanchored, protecting the next waiter', async () => {
    const openFn: OpenFn = jest.fn().mockResolvedValue({ openResult: OpenExplorerUiResult.OPENED })
    const openExplorerUiAndWaitClose = makeHelper(openFn)

    // w1 times out before its own `opened` ever arrives.
    const w1 = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_MAP }, { timeoutMs: 1000 })
    await flush()
    await engine.update(1.1)
    expect((await w1).timedOut).toBe(true)

    let w2settled = false
    const w2 = openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_MAP }).then((r) => {
      w2settled = true
      return r
    })
    await flush()

    // w1's events arrive late: opened@10 must be swallowed, closed@11 must not resolve w2.
    await injectEvent(opened(ExplorerUi.EU_MAP, 10))
    await injectEvent(closed(ExplorerUi.EU_MAP, 11))
    expect(w2settled).toBe(false)

    // w2's own session resolves it.
    await injectEvent(opened(ExplorerUi.EU_MAP, 12))
    await injectEvent(closed(ExplorerUi.EU_MAP, 13))
    expect((await w2).closed).toEqual(closed(ExplorerUi.EU_MAP, 13))
  })

  it('ignores the undefined value delivered to onChange on DELETE_ENTITY', async () => {
    const openFn: OpenFn = jest.fn().mockResolvedValue({ openResult: OpenExplorerUiResult.OPENED })
    const openExplorerUiAndWaitClose = makeHelper(openFn)

    let settled = false
    openExplorerUiAndWaitClose({ ui: ExplorerUi.EU_MAP }).then(() => (settled = true))
    await flush()

    // A DELETE_ENTITY for the root fires every component's onChange with `undefined`.
    const message = new ReadWriteByteBuffer()
    DeleteEntity.write(engine.RootEntity, message)
    transport.onmessage!(message.toBinary())
    await engine.update(0)

    expect(settled).toBe(false)
  })
})
