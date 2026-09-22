/**
 * Rejection of a superseded delete whose superseding write failed: the key's state
 * is unknown, and a delete's `false` is reserved for a confirmed absence.
 * @internal
 */
export class SupersededWriteFailed extends Error {
  constructor() {
    super('the write that superseded it failed')
    this.name = 'SupersededWriteFailed'
  }
}

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
  /** At most one queued op; a later write replaces it (latest wins). */
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
   * Resolves once the writes pending for the key at the time of the call have
   * settled: the in-flight op and, when one is queued behind it, that op too.
   * Writes issued afterwards are not awaited, so a steady stream of writes
   * cannot starve a waiter. Never rejects.
   */
  settled(key: string): Promise<void>
  /**
   * Issues a write. If one is in flight, the new op is queued — replacing any
   * already-queued op, which never runs and settles from this op's outcome
   * under its own contract (see settleSuperseded). An op identical to the
   * queued one joins it; `joinActive` additionally allows joining an
   * identical in-flight op (only valid for dedup-tolerant callers, since that
   * op was issued before this call).
   *
   * Rejects with whatever the executor threw.
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

  /**
   * A superseded op never reaches the network, so it settles from the op that
   * replaced it. "Applied" means the chain left the key in its issued state: a
   * PUT that returned true, or a DELETE that resolved (a 404 still leaves the
   * key absent). Each op reports that under its own contract: a set resolves
   * the boolean and never rejects; a delete resolves true when applied and
   * rejects otherwise. Chains compose, because the mapping preserves "applied".
   */
  function settleSuperseded(superseded: PendingOp, by: PendingOp): void {
    by.promise.then(
      (result) => {
        const applied = by.body === null || result
        if (superseded.body !== null) superseded.resolve(applied)
        else if (applied) superseded.resolve(true)
        else superseded.reject(new SupersededWriteFailed())
      },
      (error) => {
        if (superseded.body === null) superseded.reject(error)
        else superseded.resolve(false)
      }
    )
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

    async settled(key: string): Promise<void> {
      const state = keys.get(key)
      if (!state) return
      const queued = state.queued
      await state.active.promise.catch(() => undefined)
      // The queued op is awaited only if it actually started; a newer write that
      // superseded it is a different op, issued after this call.
      const next = keys.get(key)
      if (next && queued && next.active === queued) await next.active.promise.catch(() => undefined)
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
        if (state.queued.body === body) return state.queued.promise
        const op = makeOp(body, execute)
        settleSuperseded(state.queued, op)
        state.queued = op
        return op.promise
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
