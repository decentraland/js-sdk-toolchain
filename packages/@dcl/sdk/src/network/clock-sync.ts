import { Schemas } from '@dcl/ecs'
import { Room } from './events/implementation'

/**
 * Clock synchronization between clients and the authoritative server.
 *
 * Every client periodically sends a ping stamped with its own clock; the server answers with a pong that echoes
 * that stamp and adds its own clock; the client acknowledges with the server stamp so the server can measure the
 * round trip too. From each pong the client derives the round-trip time and a clock offset (server minus local at
 * the midpoint of the trip). The offset with the lowest round trip in a rolling window wins, because a fast trip
 * is the least distorted by queueing.
 *
 * Scenes read `getServerTime()` for a clock every participant agrees on, and the server reads `getPlayerLatency()`
 * to bound how early a client can claim an input happened.
 *
 * @public
 */
export type ClockSyncStats = {
  /** Estimated server clock minus local clock, in milliseconds. */
  offset: number
  /** Latest measured round trip, in milliseconds. */
  rtt: number
  /** Lowest round trip among the samples the offset was picked from. */
  bestRtt: number
  /** Number of samples in the window. */
  samples: number
  /** True while the offset is held fixed (see `freeze`). */
  frozen: boolean
}

/** Reserved message names; scenes cannot collide with them because they start with a double underscore. */
export const CLOCK_SYNC_MESSAGES = {
  __sdkClockPing: Schemas.Map({ clientAt: Schemas.Int64 }),
  __sdkClockPong: Schemas.Map({ clientAt: Schemas.Int64, serverAt: Schemas.Int64 }),
  __sdkClockAck: Schemas.Map({ serverAt: Schemas.Int64 })
}
type ClockRoom = Room<typeof CLOCK_SYNC_MESSAGES>

export const CLOCK_SYNC_DEFAULTS = {
  /** How often a client pings, in milliseconds. */
  pingIntervalMs: 1500,
  /** Samples kept per client; the best of these decides the offset. */
  windowSize: 10,
  /** Round trips above this are dropped as outliers, in milliseconds. */
  maxRttMs: 2000,
  /** The server answers at most one ping per client in this many milliseconds. */
  serverMinPingIntervalMs: 800,
  /** Server-side round trips are clamped to this, in milliseconds. */
  serverMaxRttMs: 500
}

/**
 * Pure estimator: feeds on pong samples, keeps the best of a rolling window. Testable without a room.
 * @internal
 */
export class ClockEstimator {
  private samples: { rtt: number; offset: number }[] = []
  private lastRtt = 0
  private frozenOffset: number | undefined
  private liveOffset: number | undefined

  constructor(
    private readonly windowSize = CLOCK_SYNC_DEFAULTS.windowSize,
    private readonly maxRttMs = CLOCK_SYNC_DEFAULTS.maxRttMs
  ) {}

  /** Returns true when the sample was accepted. */
  addSample(clientAt: number, serverAt: number, receivedAt: number): boolean {
    const rtt = receivedAt - clientAt
    if (rtt < 0 || rtt > this.maxRttMs) return false
    this.lastRtt = rtt
    this.samples.push({ rtt, offset: serverAt - (clientAt + rtt / 2) })
    if (this.samples.length > this.windowSize) this.samples.shift()
    this.liveOffset = this.best().offset
    return true
  }

  private best() {
    return this.samples.reduce((best, sample) => (sample.rtt < best.rtt ? sample : best))
  }

  get ready() {
    return this.liveOffset !== undefined
  }

  /** The offset in force: the frozen one while frozen, otherwise the live estimate. */
  get offset(): number | undefined {
    return this.frozenOffset ?? this.liveOffset
  }

  /**
   * Hold the current offset fixed so the scene clock cannot jump while something time-critical runs,
   * for example a synchronized performance. Samples keep flowing so the estimate is fresh when unfrozen.
   */
  freeze(frozen: boolean) {
    if (frozen && this.liveOffset !== undefined) this.frozenOffset = this.liveOffset
    if (!frozen) this.frozenOffset = undefined
  }

  reset() {
    this.samples = []
    this.lastRtt = 0
    this.frozenOffset = undefined
    this.liveOffset = undefined
  }

  stats(): ClockSyncStats | undefined {
    if (this.liveOffset === undefined || this.offset === undefined) return undefined
    return {
      offset: this.offset,
      rtt: this.lastRtt,
      bestRtt: this.best().rtt,
      samples: this.samples.length,
      frozen: this.frozenOffset !== undefined
    }
  }
}

/**
 * Server-side bookkeeping: rate limits pings and keeps each player's measured round trip.
 * @internal
 */
export class ServerClockRegistry {
  private probes = new Map<string, number>()
  private rtts = new Map<string, number>()

  constructor(
    private readonly minPingIntervalMs = CLOCK_SYNC_DEFAULTS.serverMinPingIntervalMs,
    private readonly maxRttMs = CLOCK_SYNC_DEFAULTS.serverMaxRttMs
  ) {}

  /** Returns the server stamp to answer with, or undefined when the ping is rate limited. */
  onPing(from: string, now: number): number | undefined {
    const key = from.toLowerCase()
    if (now - (this.probes.get(key) ?? -Infinity) < this.minPingIntervalMs) return undefined
    this.probes.set(key, now)
    return now
  }

  /** Records the round trip when the ack matches the last stamp sent to that player. */
  onAck(from: string, serverAt: number, now: number) {
    const key = from.toLowerCase()
    if (this.probes.get(key) !== serverAt) return
    this.rtts.set(key, Math.max(0, Math.min(this.maxRttMs, now - serverAt)))
  }

  latency(from: string): number | undefined {
    return this.rtts.get(from.toLowerCase())
  }

  forget(from: string) {
    const key = from.toLowerCase()
    this.probes.delete(key)
    this.rtts.delete(key)
  }
}

/**
 * Wires the exchange onto a room. Call once from the sync transport; the returned object is the scene-facing API.
 * @internal
 */
export function createClockSync(
  room: ClockRoom,
  isServer: () => boolean | null,
  now: () => number = () => Date.now(),
  options: Partial<typeof CLOCK_SYNC_DEFAULTS> = {}
) {
  const settings = { ...CLOCK_SYNC_DEFAULTS, ...options }
  const estimator = new ClockEstimator(settings.windowSize, settings.maxRttMs)
  const registry = new ServerClockRegistry(settings.serverMinPingIntervalMs, settings.serverMaxRttMs)
  let lastPingAt = -Infinity
  let pendingClientAt: number | undefined

  room.onMessage('__sdkClockPing', (data, context) => {
    if (!isServer() || !context) return
    const serverAt = registry.onPing(context.from, now())
    if (serverAt === undefined) return
    void room.send('__sdkClockPong', { clientAt: data.clientAt, serverAt }, { to: [context.from] })
  })
  room.onMessage('__sdkClockAck', (data, context) => {
    if (!isServer() || !context) return
    registry.onAck(context.from, data.serverAt, now())
  })
  room.onMessage('__sdkClockPong', (data) => {
    if (isServer()) return
    // Only the reply to the most recent ping is trusted; late replies would carry stale trips.
    if (data.clientAt !== pendingClientAt) return
    if (estimator.addSample(data.clientAt, data.serverAt, now()))
      void room.send('__sdkClockAck', { serverAt: data.serverAt })
  })

  return {
    /** Drive from a system every frame: sends a ping when one is due. Clients only. */
    update() {
      if (isServer() !== false || !room.isReady()) return
      const t = now()
      if (t - lastPingAt < settings.pingIntervalMs) return
      lastPingAt = t
      pendingClientAt = t
      void room.send('__sdkClockPing', { clientAt: t })
    },
    /** Server clock estimate in milliseconds since the epoch, or undefined before the first sample. */
    getServerTime(): number | undefined {
      const offset = estimator.offset
      return offset === undefined ? undefined : now() + offset
    },
    getStats: () => estimator.stats(),
    freeze: (frozen: boolean) => estimator.freeze(frozen),
    reset: () => {
      estimator.reset()
      pendingClientAt = undefined
      lastPingAt = -Infinity
    },
    /** Server only: a player's last measured round trip in milliseconds, or undefined if never acknowledged. */
    getPlayerLatency: (userId: string) => registry.latency(userId),
    forgetPlayer: (userId: string) => registry.forget(userId),
    /** @internal exposed for tests */
    estimator,
    registry
  }
}

export type ClockSync = ReturnType<typeof createClockSync>
