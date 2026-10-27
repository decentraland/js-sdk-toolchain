import {
  engine,
  ExplorerItemPurchaseResult,
  ExplorerUi,
  ExplorerUiEventsResult,
  GrowOnlyValueSetComponentDefinition,
  IEngine,
  PBExplorerItemPurchaseResult,
  PBExplorerUiEventsResult
} from '@dcl/ecs'
import { openExplorerUi, OpenExplorerUiResult } from '~system/RestrictedActions'

export { ExplorerUi, OpenExplorerUiResult }

// What an explorer that does not echo request_id, or a user-initiated action, leaves on the wire.
const UNCORRELATED = 0

// Panels that can be on screen next to another panel. The `ui` field alone cannot attribute
// their events, so an event on one of these panels must carry a request_id.
const CONCURRENT_PANELS: readonly ExplorerUi[] = [ExplorerUi.EU_ITEM_PURCHASE]

/** @public */
export type CorrelatedEvent = {
  timestamp: number
  requestId: number
}

/**
 * A named stream of events that this helper can collect and stop on.
 * @public
 */
export type Channel<N extends string = string, T extends CorrelatedEvent = CorrelatedEvent> = {
  readonly name: N
  readonly component: GrowOnlyValueSetComponentDefinition<T>
}

/** @public */
export type AnyChannel = Channel<string, any>

/**
 * Wraps a grow-only result component as a {@link Channel}. The name must be unique within a scene.
 * @public
 */
export function channel<N extends string, T extends CorrelatedEvent>(
  name: N,
  component: GrowOnlyValueSetComponentDefinition<T>
): Channel<N, T> {
  return { name, component }
}

/** Panel lifecycle events: opened and closed. @public */
export const ExplorerUiEvents: Channel<'explorerUi', PBExplorerUiEventsResult> = /* @__PURE__ */ channel(
  'explorerUi',
  ExplorerUiEventsResult
)

/** Outcome of an `EU_ITEM_PURCHASE` flow: purchased, dismissed or failed. @public */
export const ItemPurchase: Channel<'itemPurchase', PBExplorerItemPurchaseResult> = /* @__PURE__ */ channel(
  'itemPurchase',
  ExplorerItemPurchaseResult
)

/**
 * The `$case` names of a channel's event union.
 * @public
 */
export type CaseOf<C extends AnyChannel> =
  C extends Channel<any, infer T> ? Extract<T[keyof T], { $case: string }>['$case'] : never

/** @public */
export type Variant<C extends AnyChannel = AnyChannel, K extends string = string> = {
  readonly channel: C
  readonly $case: K
}

/** @public */
export function variant<C extends AnyChannel, K extends CaseOf<C>>(ch: C, $case: K): Variant<C, K> {
  return { channel: ch, $case }
}

/**
 * What ends the wait before the panel closes: any event on a channel, or one `$case` of it.
 * @public
 */
export type StopCondition = AnyChannel | Variant

/** @public */
export type Collected<C> = C extends Channel<infer N, infer T> ? { channel: N; event: T } : never

/**
 * How the wait ended.
 * - `closed`: the panel this call opened was closed.
 * - `matched`: `until` fired first, so the panel may still be on screen.
 * - `notOpened`: this call did not open anything. `openResult` says why.
 * - `timedOut`: `timeoutMs` elapsed first.
 *
 * `events` always holds everything collected, the event that stopped the wait included.
 * @public
 */
export type WaitOutcome<C extends readonly AnyChannel[]> =
  | { $case: 'closed'; events: readonly Collected<C[number]>[] }
  | { $case: 'matched'; events: readonly Collected<C[number]>[] }
  | { $case: 'notOpened'; openResult: OpenExplorerUiResult }
  | { $case: 'timedOut'; events: readonly Collected<C[number]>[] }

/** @public */
export type WaitOptions<C extends readonly AnyChannel[]> = {
  /** Channels whose events land in `events`. Defaults to none. */
  collect?: C
  /** Stops the wait early. The panel closing always stops it regardless. */
  until?: StopCondition
  /**
   * Bounds the wait, in milliseconds. On expiry the promise resolves with `$case: 'timedOut'`.
   * No default, because a panel can stay open for minutes. Without it, an explorer that opens
   * a panel and then emits no `closed` leaves the promise pending for the scene's whole life.
   */
  timeoutMs?: number
}

/** @public */
export type OpenExplorerUiRequest =
  | { ui: Exclude<ExplorerUi, ExplorerUi.EU_ITEM_PURCHASE>; itemPurchase?: undefined }
  | { ui: ExplorerUi.EU_ITEM_PURCHASE; itemPurchase: { urn: string } }

/**
 * Signature of {@link openExplorerUiAndWait}. The second overload takes a bare `ui`, so a
 * computed panel value needs no narrowing.
 * @public
 */
export interface OpenExplorerUiAndWait {
  <const C extends readonly AnyChannel[] = []>(
    request: OpenExplorerUiRequest,
    options?: WaitOptions<C>
  ): Promise<WaitOutcome<C>>
  (ui: Exclude<ExplorerUi, ExplorerUi.EU_ITEM_PURCHASE>): Promise<WaitOutcome<[]>>
}

/** @internal exposed for tests */
export const EXPLORER_UI_WAIT_TIMEOUT_SYSTEM = 'explorer-ui-wait-timeout'

// Lowest priority sorts this system last, so when it removes itself mid-tick it splices the
// last element of the array the engine is iterating and skips no other system.
const TIMEOUT_SYSTEM_PRIORITY = Number.MIN_SAFE_INTEGER

type OpenExplorerUiFn = (body: {
  ui: ExplorerUi
  requestId?: number
  itemPurchase?: { urn: string }
}) => Promise<{ openResult: OpenExplorerUiResult }>

type CollectedEvent = { channel: string; event: CorrelatedEvent }

type Session = {
  requestId: number
  ui: ExplorerUi
  correlationRequired: boolean
  collect: ReadonlySet<string>
  watched: ReadonlySet<string>
  until: { channel: string; $case: string | undefined } | undefined
  events: CollectedEvent[]
  timeoutMs: number | undefined
  elapsedMs: number
  settled: boolean
  settle: (outcome: WaitOutcome<never[]>) => void
  fail: (error: Error) => void
}

type Attribution = 'yes' | 'no' | 'ambiguous'

// ts-proto renders a `oneof` as one wrapper property `{ $case, [$case]: value }`. Finding that
// property by shape keeps the helper independent of the name each message gave it: `event` on
// one message, `status` on another.
function caseOf(event: CorrelatedEvent): string | undefined {
  for (const key of Object.keys(event)) {
    const value = (event as unknown as Record<string, unknown>)[key]
    if (value && typeof value === 'object' && typeof (value as { $case?: unknown }).$case === 'string') {
      return (value as { $case: string }).$case
    }
  }
  return undefined
}

function normalizeStop(stop: StopCondition): { channel: AnyChannel; $case: string | undefined } {
  return '$case' in stop ? { channel: stop.channel, $case: stop.$case } : { channel: stop, $case: undefined }
}

/** @internal test seam. The production instance is {@link openExplorerUiAndWait}. */
export function create(deps: {
  engine: IEngine
  openExplorerUi: OpenExplorerUiFn
  explorerUiEvents: Channel<'explorerUi', PBExplorerUiEventsResult>
}) {
  const { engine: engineInstance, openExplorerUi: openExplorerUiFn, explorerUiEvents } = deps
  const root = engineInstance.RootEntity

  const sessions = new Map<number, Session>()
  // Keyed by name, so two wrappers around the same component arm one listener, not two.
  const armed = new Map<string, GrowOnlyValueSetComponentDefinition<any>>()
  // Starts at 1 so a minted id never collides with UNCORRELATED.
  let nextRequestId = 1
  let timeoutSystemAdded = false

  function arm(ch: AnyChannel) {
    const bound = armed.get(ch.name)
    if (bound) {
      if (bound !== ch.component) {
        throw new Error(
          `openExplorerUiAndWait: channel name '${ch.name}' is already bound to a different component. ` +
            `Channel names identify a stream, so they have to be unique within a scene.`
        )
      }
      return
    }
    armed.set(ch.name, ch.component)
    const name = ch.name
    // onChange has no unsubscribe, so one listener per channel lives for the engine's lifetime.
    ch.component.onChange(root, (value: CorrelatedEvent | undefined) => {
      // `undefined` arrives on DELETE_ENTITY. Otherwise `value` is one appended element,
      // not the whole set.
      if (value) deliver(name, value)
    })
  }

  function attribute(session: Session, name: string, event: CorrelatedEvent): Attribution {
    if (event.requestId === session.requestId) return 'yes'
    if (event.requestId !== UNCORRELATED) return 'no'
    // Only the lifecycle channel carries a second discriminator, `ui`, and it identifies a
    // session only while panels cannot coexist. A second call for the same panel is answered
    // WAS_ALREADY_OPEN, so at most one session per non-concurrent panel is ever live.
    if (session.correlationRequired || name !== explorerUiEvents.name) return 'ambiguous'
    return (event as PBExplorerUiEventsResult).ui === session.ui ? 'yes' : 'no'
  }

  function deliver(name: string, event: CorrelatedEvent) {
    // Settling deletes from `sessions` mid-iteration, which a Map tolerates. Nothing adds.
    for (const session of sessions.values()) {
      if (!session.watched.has(name)) continue
      const attribution = attribute(session, name, event)
      if (attribution === 'no') continue
      if (attribution === 'ambiguous') {
        failSession(
          session,
          new Error(
            `openExplorerUiAndWait: got a '${name}' event with no request_id, and nothing else identifies ` +
              `the call it belongs to. This explorer does not echo OpenExplorerUiRequest.request_id.`
          )
        )
        continue
      }
      accept(session, name, event)
    }
  }

  function accept(session: Session, name: string, event: CorrelatedEvent) {
    if (session.collect.has(name)) session.events.push({ channel: name, event })

    // The close is terminal and wins over `until`, because `matched` would tell the caller
    // that the panel is still on screen.
    if (name === explorerUiEvents.name && caseOf(event) === 'closed') {
      settleSession(session, { $case: 'closed', events: session.events as never[] })
      return
    }

    const until = session.until
    if (!until || until.channel !== name) return
    if (until.$case === undefined || until.$case === caseOf(event)) {
      settleSession(session, { $case: 'matched', events: session.events as never[] })
    }
  }

  function settleSession(session: Session, outcome: WaitOutcome<never[]>) {
    if (session.settled) return
    session.settled = true
    sessions.delete(session.requestId)
    session.settle(outcome)
    maybeRemoveTimeoutSystem()
  }

  function failSession(session: Session, error: Error) {
    if (session.settled) return
    session.settled = true
    sessions.delete(session.requestId)
    session.fail(error)
    maybeRemoveTimeoutSystem()
  }

  function hasTimedSession(): boolean {
    for (const session of sessions.values()) {
      if (session.timeoutMs !== undefined) return true
    }
    return false
  }

  function maybeRemoveTimeoutSystem() {
    if (!timeoutSystemAdded || hasTimedSession()) return
    timeoutSystemAdded = false
    engineInstance.removeSystem(EXPLORER_UI_WAIT_TIMEOUT_SYSTEM)
  }

  function ensureTimeoutSystem() {
    if (timeoutSystemAdded) return
    timeoutSystemAdded = true
    // The scene runtime has no timers, so elapsed time is accumulated from the engine's dt.
    engineInstance.addSystem(
      (dt: number) => {
        for (const session of sessions.values()) {
          if (session.timeoutMs === undefined) continue
          session.elapsedMs += dt * 1000
          if (session.elapsedMs >= session.timeoutMs) {
            settleSession(session, { $case: 'timedOut', events: session.events as never[] })
          }
        }
        maybeRemoveTimeoutSystem()
      },
      TIMEOUT_SYSTEM_PRIORITY,
      EXPLORER_UI_WAIT_TIMEOUT_SYSTEM
    )
  }

  async function openExplorerUiAndWait(
    request: OpenExplorerUiRequest | Exclude<ExplorerUi, ExplorerUi.EU_ITEM_PURCHASE>,
    options?: WaitOptions<readonly AnyChannel[]>
  ): Promise<WaitOutcome<never[]>> {
    const { ui, itemPurchase } = typeof request === 'number' ? { ui: request, itemPurchase: undefined } : request
    const requestId = nextRequestId++

    const collect = options?.collect ?? []
    const collectNames = new Set<string>()
    for (const ch of collect) collectNames.add(ch.name)

    const stop = options?.until ? normalizeStop(options.until) : undefined
    const watched = new Set<string>(collectNames)
    watched.add(explorerUiEvents.name)
    if (stop) watched.add(stop.channel.name)

    // Armed before the RPC, because events can land while the RPC is in flight. A listener
    // that is already up is what makes replaying the accumulated set unnecessary.
    arm(explorerUiEvents)
    for (const ch of collect) arm(ch)
    if (stop) arm(stop.channel)

    let settle!: (outcome: WaitOutcome<never[]>) => void
    let fail!: (error: Error) => void
    const outcome = new Promise<WaitOutcome<never[]>>((resolve, reject) => {
      settle = resolve
      fail = reject
    })

    const session: Session = {
      requestId,
      ui,
      correlationRequired: CONCURRENT_PANELS.includes(ui),
      collect: collectNames,
      watched,
      until: stop ? { channel: stop.channel.name, $case: stop.$case } : undefined,
      events: [],
      timeoutMs: options?.timeoutMs,
      elapsedMs: 0,
      settled: false,
      settle,
      fail
    }
    sessions.set(requestId, session)
    if (session.timeoutMs !== undefined) ensureTimeoutSystem()

    try {
      const { openResult } = await openExplorerUiFn({ ui, requestId, itemPurchase })
      // This call opened nothing, so no event carrying this request id is coming.
      if (openResult !== OpenExplorerUiResult.OPENED) {
        settleSession(session, { $case: 'notOpened', openResult })
      }
    } catch (error) {
      // Routed through the session rather than rethrown, so that `outcome` is never left
      // pending and unobserved.
      failSession(session, error as Error)
    }

    return outcome
  }

  // The implementation takes both argument forms and is blind to `collect`. The cast is what
  // gives callers the two overloads that relate them.
  return { openExplorerUiAndWait: openExplorerUiAndWait as OpenExplorerUiAndWait }
}

const helper = /* @__PURE__ */ create({ engine, openExplorerUi, explorerUiEvents: ExplorerUiEvents })

/**
 * Opens an explorer panel and waits for the session it started. The wait ends when the panel
 * closes. See {@link WaitOptions} to collect events, to stop earlier or to bound the wait.
 *
 * Every lifecycle outcome resolves, see {@link WaitOutcome}. The promise rejects only when an
 * event cannot be attributed to a call at all: an explorer too old to echo `request_id`
 * paired with a panel that can coexist with another one.
 *
 * @public
 */
export const openExplorerUiAndWait: OpenExplorerUiAndWait = helper.openExplorerUiAndWait
