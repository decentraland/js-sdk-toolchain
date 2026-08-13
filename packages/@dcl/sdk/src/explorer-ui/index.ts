import {
  engine,
  ExplorerUi,
  ExplorerUiEventsResult,
  GrowOnlyValueSetComponentDefinition,
  IEngine,
  PBExplorerUiEventsResult
} from '@dcl/ecs'
import { openExplorerUi, OpenExplorerUiResult } from '~system/RestrictedActions'

// Re-export the enums a scene needs to build a request and read a verdict, so a
// single `@dcl/sdk/explorer-ui` import is enough to use the helper end to end.
export { ExplorerUi, OpenExplorerUiResult }

/**
 * Request accepted by {@link openExplorerUiAndWaitClose}. Mirrors the underlying
 * `openExplorerUi` RPC request: the fullscreen panel to open.
 * @public
 */
export type OpenExplorerUiAndWaitCloseRequest = {
  /** The fullscreen explorer panel to open. */
  ui: ExplorerUi
}

/**
 * Options for {@link openExplorerUiAndWaitClose}.
 * @public
 */
export type OpenExplorerUiAndWaitCloseOptions = {
  /**
   * Maximum time to wait for the panel to close, in milliseconds. There is NO
   * default: panels legitimately stay open for minutes and the helper is happy
   * to wait that long.
   *
   * Provide a timeout when the scene needs a guaranteed resolution. On the
   * explorer's cancellation path `OnViewClosed` does not fire, so a `closed`
   * event may never arrive; without a timeout the returned promise would then
   * hang for the whole lifetime of the scene runtime. On expiry the promise
   * resolves (it never rejects) with `timedOut: true`.
   */
  timeoutMs?: number
}

/**
 * Result of {@link openExplorerUiAndWaitClose}.
 *
 * The promise NEVER rejects on lifecycle grounds. Inspect the fields to learn
 * what happened:
 * - `openResult !== OpenExplorerUiResult.OPENED`: the panel was not opened by
 *   this call (rejected, or already open); it resolves immediately and neither
 *   `closed` nor a timeout apply.
 * - `openResult === OpenExplorerUiResult.OPENED` and `closed` is set: the panel
 *   this call opened was later closed; `closed` is that lifecycle event.
 * - `openResult === OpenExplorerUiResult.OPENED` and `timedOut === true`: the
 *   configured `timeoutMs` elapsed before a matching `closed` event arrived.
 *
 * The only way the wait ends without resolving is the scene runtime being
 * unloaded, which tears the promise down with it.
 * @public
 */
export type OpenExplorerUiAndWaitCloseResult = {
  /** The verdict returned by the underlying `openExplorerUi` RPC. */
  openResult: OpenExplorerUiResult
  /**
   * The `closed` lifecycle event that ended the wait. Present only when the
   * panel was opened by this call and then closed. Undefined for non-OPENED
   * verdicts and for a timed-out wait.
   */
  closed?: PBExplorerUiEventsResult
  /**
   * `true` only when the panel was opened by this call and the wait ended
   * because `timeoutMs` elapsed before a matching `closed` event.
   */
  timedOut: boolean
}

/** @internal - exposed for tests; stripped from the public .d.ts. */
export const EXPLORER_UI_WAIT_CLOSE_TIMEOUT_SYSTEM = 'explorer-ui-wait-close-timeout'

// Runs the timeout accounting after every regular scene system. A very low
// priority guarantees the system is the LAST one in the engine's system list,
// which is what makes it safe for the system to remove itself from inside its
// own tick: splicing the last element out of the array the engine is iterating
// does not skip any other system.
const TIMEOUT_SYSTEM_PRIORITY = Number.MIN_SAFE_INTEGER

type Waiter = {
  ui: ExplorerUi
  // Highest timestamp already present in the accumulated set when the RPC was
  // issued. Events at or below it belong to earlier sessions and are ignored.
  snapshot: number
  // Timestamp of our own `opened` once matched; null until then. Anchoring on
  // our own `opened` prevents a stale in-flight `closed` from a previous
  // session from resolving us while our panel is still open.
  anchor: number | null
  timeoutMs: number | undefined
  elapsedMs: number
  resolved: boolean
  resolve: (result: OpenExplorerUiAndWaitCloseResult) => void
}

type OpenExplorerUiFn = (request: { ui: ExplorerUi }) => Promise<{ openResult: OpenExplorerUiResult }>

/**
 * @internal
 * Builds the helper against an explicit engine, component definition and
 * `openExplorerUi` implementation. Production code uses the pre-wired
 * {@link openExplorerUiAndWaitClose}; this factory exists so tests can drive an
 * isolated engine and a mocked RPC.
 */
export function createOpenExplorerUiAndWaitClose(
  engineInstance: IEngine,
  eventsComponent: GrowOnlyValueSetComponentDefinition<PBExplorerUiEventsResult>,
  openExplorerUiFn: OpenExplorerUiFn
) {
  const root = engineInstance.RootEntity

  const waiters: Waiter[] = []
  // Highest timestamp per ui already CONSUMED (anchored a waiter, resolved one,
  // or was swallowed below). The replay scan a late-arming waiter runs over the
  // accumulated set must skip consumed events — otherwise it would re-consume a
  // previous session's opened/closed pair that already settled another waiter,
  // and resolve on a `closed` that is not its own.
  const consumedMax = new Map<ExplorerUi, number>()
  // Per ui, how many upcoming `opened` events to swallow without anchoring:
  // one for each waiter that timed out before its own `opened` arrived. Without
  // this, that orphaned `opened` would anchor the NEXT waiter for the same ui,
  // whose own session is one step later. (If the orphaned `opened` never comes
  // at all — the explorer failed to show after an OPENED verdict — the swallow
  // misfires on the next session and that waiter resolves one session early;
  // exact correlation is impossible without session ids, which the protocol
  // deliberately omits in v1.)
  const openedToSwallow = new Map<ExplorerUi, number>()
  let dispatcherRegistered = false
  let timeoutSystemAdded = false

  function maxSeenTimestamp(): number {
    let max = -1
    for (const event of eventsComponent.get(root)) {
      if (event.timestamp > max) max = event.timestamp
    }
    return max
  }

  function resolveWaiter(waiter: Waiter, result: OpenExplorerUiAndWaitCloseResult) {
    if (waiter.resolved) return
    waiter.resolved = true
    const index = waiters.indexOf(waiter)
    if (index !== -1) waiters.splice(index, 1)
    waiter.resolve(result)
    maybeRemoveTimeoutSystem()
  }

  function markConsumed(event: PBExplorerUiEventsResult) {
    const previous = consumedMax.get(event.ui) ?? -1
    if (event.timestamp > previous) consumedMax.set(event.ui, event.timestamp)
  }

  // Routes a single incoming event to at most one waiter, honouring per-ui FIFO:
  // an `opened` anchors the OLDEST unanchored waiter for that ui; a qualifying
  // `closed` resolves the OLDEST anchored waiter. Events arrive in timestamp
  // order, so FIFO matches session order.
  function dispatchEvent(event: PBExplorerUiEventsResult) {
    const kind = event.event?.$case
    if (kind === 'opened') {
      const pendingSwallows = openedToSwallow.get(event.ui) ?? 0
      if (pendingSwallows > 0) {
        openedToSwallow.set(event.ui, pendingSwallows - 1)
        markConsumed(event)
        return
      }
      for (const waiter of waiters) {
        if (waiter.resolved || waiter.ui !== event.ui || waiter.anchor !== null) continue
        if (event.timestamp <= waiter.snapshot) continue
        waiter.anchor = event.timestamp
        markConsumed(event)
        return
      }
    } else if (kind === 'closed') {
      for (const waiter of waiters) {
        if (waiter.resolved || waiter.ui !== event.ui || waiter.anchor === null) continue
        if (event.timestamp < waiter.anchor) continue
        markConsumed(event)
        resolveWaiter(waiter, { openResult: OpenExplorerUiResult.OPENED, closed: event, timedOut: false })
        return
      }
    }
  }

  function ensureDispatcher() {
    if (dispatcherRegistered) return
    dispatcherRegistered = true
    // onChange has no unsubscribe, so exactly one dispatcher is registered for
    // the lifetime of the engine and it fans out to the mutable waiter list.
    eventsComponent.onChange(root, (value: PBExplorerUiEventsResult | undefined) => {
      // On DELETE_ENTITY the engine fires every onChange with `undefined`; guard it.
      if (!value) return
      // The incoming (renderer -> scene) path delivers a single appended element,
      // which is what a scene ever sees for this renderer-owned result component.
      dispatchEvent(value as PBExplorerUiEventsResult)
    })
  }

  function hasPendingTimedWaiter(): boolean {
    for (const waiter of waiters) {
      if (waiter.timeoutMs !== undefined) return true
    }
    return false
  }

  function maybeRemoveTimeoutSystem() {
    if (!timeoutSystemAdded || hasPendingTimedWaiter()) return
    timeoutSystemAdded = false
    engineInstance.removeSystem(EXPLORER_UI_WAIT_CLOSE_TIMEOUT_SYSTEM)
  }

  function ensureTimeoutSystem() {
    if (timeoutSystemAdded) return
    timeoutSystemAdded = true
    engineInstance.addSystem(
      (dt: number) => {
        // Copy first: resolveWaiter mutates `waiters` while we iterate.
        for (const waiter of [...waiters]) {
          if (waiter.resolved || waiter.timeoutMs === undefined) continue
          waiter.elapsedMs += dt * 1000
          if (waiter.elapsedMs >= waiter.timeoutMs) {
            // Timing out before our own `opened` arrived leaves that `opened`
            // in flight; earmark it for swallowing so it cannot anchor the next
            // waiter for the same ui.
            if (waiter.anchor === null) {
              openedToSwallow.set(waiter.ui, (openedToSwallow.get(waiter.ui) ?? 0) + 1)
            }
            resolveWaiter(waiter, { openResult: OpenExplorerUiResult.OPENED, closed: undefined, timedOut: true })
          }
        }
        maybeRemoveTimeoutSystem()
      },
      TIMEOUT_SYSTEM_PRIORITY,
      EXPLORER_UI_WAIT_CLOSE_TIMEOUT_SYSTEM
    )
  }

  async function openExplorerUiAndWaitClose(
    request: OpenExplorerUiAndWaitCloseRequest,
    options?: OpenExplorerUiAndWaitCloseOptions
  ): Promise<OpenExplorerUiAndWaitCloseResult> {
    // Snapshot BEFORE the RPC so events that land during the await window (the
    // renderer can open+close before our continuation runs) are still recovered.
    const snapshot = maxSeenTimestamp()

    const { openResult } = await openExplorerUiFn({ ui: request.ui })

    // The panel was not opened by this call. No `closed` event will ever reach
    // this scene for it (a WAS_ALREADY_OPEN panel is owned by whoever opened it),
    // so resolve immediately instead of waiting forever.
    if (openResult !== OpenExplorerUiResult.OPENED) {
      return { openResult, timedOut: false }
    }

    return new Promise<OpenExplorerUiAndWaitCloseResult>((resolve) => {
      const waiter: Waiter = {
        ui: request.ui,
        snapshot,
        anchor: null,
        timeoutMs: options?.timeoutMs,
        elapsedMs: 0,
        resolved: false,
        resolve
      }
      waiters.push(waiter)
      ensureDispatcher()
      if (waiter.timeoutMs !== undefined) ensureTimeoutSystem()

      // Recover events that arrived before this waiter was registered. The set
      // is kept sorted by timestamp, so replaying it through the same state
      // machine anchors and (if already closed) resolves in session order.
      // Events already consumed by an earlier waiter are skipped — they are in
      // the accumulated set forever, but they are not ours.
      for (const event of eventsComponent.get(root)) {
        if (waiter.resolved) break
        if (event.timestamp <= snapshot) continue
        if (event.timestamp <= (consumedMax.get(event.ui) ?? -1)) continue
        dispatchEvent(event as PBExplorerUiEventsResult)
      }
    })
  }

  return { openExplorerUiAndWaitClose }
}

const helper = /* @__PURE__ */ createOpenExplorerUiAndWaitClose(engine, ExplorerUiEventsResult, openExplorerUi)

/**
 * Opens a fullscreen explorer panel and, when this call actually opened it,
 * resolves once that panel closes.
 *
 * Backed by the `openExplorerUi` RPC for the open action and by the
 * `ExplorerUiEventsResult` grow-only component (appended to the scene root by
 * the renderer) for the close observation. The wait is event driven: it never
 * polls.
 *
 * Behaviour:
 * - If the open verdict is anything other than `OpenExplorerUiResult.OPENED`
 *   (including `WAS_ALREADY_OPEN`), it resolves immediately carrying that
 *   verdict — the scene did not open the panel, so no `closed` event is coming.
 * - If the verdict is `OPENED`, it resolves when the matching `closed` event
 *   for that same panel arrives, carrying the event in `closed`.
 * - If `options.timeoutMs` is set and elapses first, it resolves with
 *   `timedOut: true`. Supplying a timeout is the only guard against a wait that
 *   would otherwise hang (the explorer does not emit `closed` on its cancel
 *   path); see {@link OpenExplorerUiAndWaitCloseOptions.timeoutMs}.
 *
 * The promise NEVER rejects on lifecycle grounds; it is torn down only when the
 * scene runtime unloads.
 * @public
 */
export const openExplorerUiAndWaitClose = helper.openExplorerUiAndWaitClose
