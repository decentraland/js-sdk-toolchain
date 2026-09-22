/**
 * A pending write operation. `body` is the serialized PUT payload, or null
 * for a DELETE. Callers coalesced into the op share its promise.
 * @internal
 */
interface PendingOp {
  body: string | null
  execute: (body: string | null) => Promise<boolean>
  promise: Promise<boolean>
  resolve: (result: boolean) => void
  reject: (error: unknown) => void
}

interface KeyState {
  /** The op currently on the network. */
  active: PendingOp
  /** At most one queued op; later writes replace its payload (latest wins). */
  queued?: PendingOp
}

/**
 * Serializes writes per key so the service commits them in issue order.
 * Overlapping PUTs from the single scene server would otherwise race: the
 * server keeps whichever request it processes last, while the local cache
 * keeps whichever response arrives last — either can disagree with the last
 * set() issued. With at most one in-flight op per key and a single queued
 * "latest value" slot, the server's final state always matches the last
 * write issued, and N rapid writes collapse into at most 2 network calls.
 * @internal
 */
export interface WriteQueue {
  /**
   * Body of the latest issued write for the key (the queued op if present,
   * else the in-flight one): a string for a PUT, null for a DELETE,
   * undefined when no write is pending.
   */
  pending(key: string): string | null | undefined
  /** True while any write for the key is in flight or queued. */
  isPending(key: string): boolean
  /**
   * Issues a write. If one is in flight, the new op is queued — replacing any
   * already-queued op, whose callers then follow this op's outcome (their
   * value was superseded before it could ever be observed). An op identical
   * to the queued one joins it; `joinActive` additionally allows joining an
   * identical in-flight op (only valid for dedup-tolerant callers, since that
   * op was issued before this call).
   *
   * Rejects with whatever the executor threw. A superseded caller follows the
   * superseding op's outcome, rejection included.
   */
  enqueue(
    key: string,
    body: string | null,
    execute: (body: string | null) => Promise<boolean>,
    joinActive: boolean
  ): Promise<boolean>
}

/**
 * Creates the per-key write serializer shared by a storage scope.
 * @internal
 */
export function createWriteQueue(): WriteQueue {
  const keys = new Map<string, KeyState>()

  function makeOp(body: string | null, execute: PendingOp['execute']): PendingOp {
    let resolve!: (result: boolean) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<boolean>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { body, execute, promise, resolve, reject }
  }

  async function drain(key: string, state: KeyState): Promise<void> {
    for (;;) {
      const op = state.active
      try {
        op.resolve(await op.execute(op.body))
      } catch (error) {
        // A throw is a failure the executor refuses to express as `false`.
        op.reject(error)
      }

      if (state.queued) {
        state.active = state.queued
        state.queued = undefined
      } else {
        keys.delete(key)
        return
      }
    }
  }

  return {
    pending(key: string): string | null | undefined {
      const state = keys.get(key)
      if (!state) return undefined
      return (state.queued ?? state.active).body
    },

    isPending(key: string): boolean {
      return keys.has(key)
    },

    enqueue(key: string, body: string | null, execute: PendingOp['execute'], joinActive: boolean): Promise<boolean> {
      const state = keys.get(key)

      if (!state) {
        const op = makeOp(body, execute)
        const newState: KeyState = { active: op }
        keys.set(key, newState)
        void drain(key, newState)
        return op.promise
      }

      if (state.queued) {
        // A queued op has not started, so it is issued "after" this caller
        // either way: join it when identical, supersede it otherwise.
        if (state.queued.body !== body) {
          state.queued.body = body
          state.queued.execute = execute
        }
        return state.queued.promise
      }

      if (joinActive && state.active.body === body) {
        return state.active.promise
      }

      const op = makeOp(body, execute)
      state.queued = op
      return op.promise
    }
  }
}
