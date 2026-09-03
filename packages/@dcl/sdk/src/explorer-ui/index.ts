import {
  engine,
  ExplorerUi,
  ExplorerUiEventsResult,
  GrowOnlyValueSetComponentDefinition,
  IEngine,
  PBExplorerUiEventsResult
} from '@dcl/ecs'
import { openExplorerUi, OpenExplorerUiResult } from '~system/RestrictedActions'

// Re-exported so one `@dcl/sdk/explorer-ui` import covers the whole flow.
export { ExplorerUi, OpenExplorerUiResult }

/**
 * Request for {@link openExplorerUiAndWaitClose}. Mirrors the `openExplorerUi` RPC request.
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
   * Maximum time to wait for the close, in milliseconds. No default: panels can
   * legitimately stay open for minutes.
   *
   * Set it when the scene needs a guaranteed resolution: the explorer does not
   * emit `closed` on its cancellation path, so without a timeout the promise
   * can hang for the rest of the scene's lifetime. On expiry the promise
   * resolves (never rejects) with `timedOut: true`.
   */
  timeoutMs?: number
}

/**
 * Result of {@link openExplorerUiAndWaitClose}. The promise never rejects on
 * lifecycle grounds — inspect the fields:
 * - `openResult !== OPENED`: this call did not open the panel; resolved immediately.
 * - `closed` is set: the panel this call opened was later closed.
 * - `timedOut === true`: `timeoutMs` elapsed before a matching `closed` event.
 * @public
 */
export type OpenExplorerUiAndWaitCloseResult = {
  /** The verdict returned by the underlying `openExplorerUi` RPC. */
  openResult: OpenExplorerUiResult
  /** The `closed` event that ended the wait. Only set when this call opened the panel and it later closed. */
  closed?: PBExplorerUiEventsResult
  /** `true` when `timeoutMs` elapsed before a matching `closed` event. */
  timedOut: boolean
}

/** @internal exposed for tests */
export const EXPLORER_UI_WAIT_CLOSE_TIMEOUT_SYSTEM = 'explorer-ui-wait-close-timeout'

// Lowest priority sorts this system last, so removing itself mid-tick splices
// the last element of the array the engine is iterating and skips no one.
const TIMEOUT_SYSTEM_PRIORITY = Number.MIN_SAFE_INTEGER

type Waiter = {
  ui: ExplorerUi
  // Highest timestamp in the set when the RPC was issued; events at or below it belong to earlier sessions.
  snapshot: number
  // Timestamp of our own `opened`, null until matched. Keeps a stale `closed`
  // from an earlier session from resolving us while our panel is still open.
  anchor: number | null
  timeoutMs: number | undefined
  elapsedMs: number
  resolved: boolean
  resolve: (result: OpenExplorerUiAndWaitCloseResult) => void
}

type OpenExplorerUiFn = (request: { ui: ExplorerUi }) => Promise<{ openResult: OpenExplorerUiResult }>

/**
 * @internal
 * Test seam: builds the helper against an explicit engine, component and RPC.
 * Production code uses the pre-wired {@link openExplorerUiAndWaitClose}.
 */
export function createOpenExplorerUiAndWaitClose(
  engineInstance: IEngine,
  eventsComponent: GrowOnlyValueSetComponentDefinition<PBExplorerUiEventsResult>,
  openExplorerUiFn: OpenExplorerUiFn
) {
  const root = engineInstance.RootEntity

  const waiters: Waiter[] = []
  // Highest timestamp per ui already consumed (anchored, resolved or swallowed).
  // The replay scan must skip these, or a late-arming waiter would resolve on a
  // `closed` from a session that already settled another waiter.
  const consumedMax = new Map<ExplorerUi, number>()
  // Per ui: how many future `opened` events to drop without anchoring — one for
  // each waiter that timed out before its own `opened` arrived; otherwise that
  // orphan would anchor the next waiter. Exact matching would need session ids,
  // which the protocol does not have in v1.
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

  // Routes one event to at most one waiter. Events arrive in timestamp order,
  // so per-ui FIFO (oldest waiter first) matches session order.
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
    // onChange has no unsubscribe, so one dispatcher lives for the engine's lifetime.
    eventsComponent.onChange(root, (value: PBExplorerUiEventsResult | undefined) => {
      // undefined is delivered on DELETE_ENTITY.
      if (!value) return
      // The incoming CRDT path delivers each appended element individually.
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
            // Our `opened` is still in flight; make sure it cannot anchor the next waiter.
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
    // Snapshot before the RPC: the renderer can open and close the panel before
    // our continuation runs, and the replay below recovers those events.
    const snapshot = maxSeenTimestamp()

    const { openResult } = await openExplorerUiFn({ ui: request.ui })

    // This call did not open the panel, so its `closed` event will never reach
    // this scene — resolve now instead of waiting forever.
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

      // Replay events that arrived before this waiter registered. The set is
      // sorted by timestamp; events consumed by earlier waiters are not ours.
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
 * Open goes through the `openExplorerUi` RPC; the close is observed on the
 * `ExplorerUiEventsResult` grow-only component — event driven, no polling.
 *
 * Non-`OPENED` verdicts (including `WAS_ALREADY_OPEN`) resolve immediately:
 * the scene did not open the panel, so no `closed` event is coming. Pass
 * `options.timeoutMs` to bound the wait — see
 * {@link OpenExplorerUiAndWaitCloseOptions.timeoutMs}. The promise never
 * rejects on lifecycle grounds; see {@link OpenExplorerUiAndWaitCloseResult}.
 * @public
 */
export const openExplorerUiAndWaitClose = helper.openExplorerUiAndWaitClose
