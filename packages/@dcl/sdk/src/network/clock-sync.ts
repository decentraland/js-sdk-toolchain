/**
 * Clock synchronization between clients and the authoritative server, NTP style: the client stamps a ping when
 * it leaves, the server stamps it on arrival and stamps the pong when it leaves, the client stamps the pong on
 * arrival. The server's own hold time is subtracted from the round trip, and the offset from the fastest trip in
 * a rolling window wins because a fast trip is the least distorted by queueing.
 */
import { Schemas } from '@dcl/ecs'
import { Room } from './events/implementation'
import { encodeEvent } from './events/protocol'
import { EventTypes } from './events/registry'

/**
 * Quality of the server-clock estimate.
 * @public
 */
export type ClockSyncStats = {
  /** Estimated server clock minus `Date.now()`, in milliseconds. */
  offset: number
  /** Latest measured round trip, in milliseconds. */
  rtt: number
  /** Lowest round trip among the samples the offset was picked from. */
  bestRtt: number
  /** Number of samples in the window. */
  samples: number
  /** True while the estimate is held fixed (see `freezeServerClock`). */
  frozen: boolean
}

/** Stamps are Double: Int64 serialization throws on the fractional values `performance.now()` returns. */
export const CLOCK_SYNC_MESSAGES = {
  __sdkClockPing: Schemas.Map({ clientAt: Schemas.Double }),
  __sdkClockPong: Schemas.Map({ clientAt: Schemas.Double, receivedAt: Schemas.Double, serverAt: Schemas.Double }),
  __sdkClockAck: Schemas.Map({ serverAt: Schemas.Double, heldMs: Schemas.Double })
}
type ClockMessages = typeof CLOCK_SYNC_MESSAGES
type ClockRoom = Room<ClockMessages>

export const CLOCK_SYNC_DEFAULTS = {
  /** How often a client pings, in milliseconds. */
  pingIntervalMs: 1500,
  /** Samples kept per client; the best of these decides the offset. */
  windowSize: 10,
  /** Round trips above this are dropped, and unanswered pings older than this are forgotten, in milliseconds. */
  maxRttMs: 2000,
  /** How fast the applied offset may move towards a new estimate, in ms per ms of local time. */
  maxSlewRate: 0.05,
  /** Corrections larger than this are applied at once instead of slewed, in milliseconds. */
  snapThresholdMs: 1000,
  /** The server answers at most one ping per client in this many milliseconds. */
  serverMinPingIntervalMs: 800,
  /** Server-side round trips are clamped to this, in milliseconds. */
  serverMaxRttMs: 500,
  /** Acknowledged round trips kept per player; the reported latency is their median. */
  serverLatencyWindow: 5,
  /** Players that stop pinging for this long are forgotten, in milliseconds. */
  serverForgetAfterMs: 30_000
}
export type ClockSyncOptions = typeof CLOCK_SYNC_DEFAULTS

/** @internal */
export function monotonicClock(): () => number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance
  return typeof perf?.now === 'function' ? () => perf.now!() : () => Date.now()
}

/**
 * Feeds on four-timestamp samples and keeps the best of a rolling window. The applied offset slews towards the
 * estimate instead of jumping, so the clock it drives runs smoothly.
 * @internal
 */
export class ClockEstimator {
  private readonly settings: ClockSyncOptions
  private samples: { rtt: number; offset: number }[] = []
  private lastRtt = 0
  private target: number | undefined
  private applied: number | undefined
  private appliedAt = 0
  private frozen = false

  constructor(options: Partial<ClockSyncOptions> = {}) {
    this.settings = { ...CLOCK_SYNC_DEFAULTS, ...options }
  }

  /**
   * `clientAt` and `arrivedAt` are local clock stamps, `receivedAt` and `serverAt` server clock stamps.
   * Returns true when the sample was accepted.
   */
  addSample(clientAt: number, receivedAt: number, serverAt: number, arrivedAt: number): boolean {
    const held = serverAt - receivedAt
    const rtt = arrivedAt - clientAt - held
    if (held < 0 || rtt < 0 || rtt > this.settings.maxRttMs) return false
    this.lastRtt = rtt
    this.samples.push({ rtt, offset: (receivedAt - clientAt + serverAt - arrivedAt) / 2 })
    if (this.samples.length > this.settings.windowSize) this.samples.shift()
    this.target = this.best().offset
    if (this.applied === undefined) {
      this.applied = this.target
      this.appliedAt = arrivedAt
    }
    return true
  }

  private best() {
    return this.samples.reduce((best, sample) => (sample.rtt < best.rtt ? sample : best))
  }

  get ready() {
    return this.applied !== undefined
  }

  /** The offset in force at local time `now`, advancing the slew towards the latest estimate. */
  offsetAt(now: number): number | undefined {
    if (this.applied === undefined || this.target === undefined) return undefined
    const diff = this.target - this.applied
    if (!this.frozen && diff !== 0) {
      if (Math.abs(diff) > this.settings.snapThresholdMs) {
        this.applied = this.target
      } else {
        const step = this.settings.maxSlewRate * Math.max(0, now - this.appliedAt)
        this.applied += Math.max(-step, Math.min(step, diff))
      }
    }
    this.appliedAt = now
    return this.applied
  }

  /** While frozen the applied offset holds still; samples keep refining the estimate it slews to afterwards. */
  freeze(frozen: boolean) {
    this.frozen = frozen
  }

  get isFrozen() {
    return this.frozen
  }

  reset() {
    this.samples = []
    this.lastRtt = 0
    this.target = undefined
    this.applied = undefined
    this.appliedAt = 0
  }

  stats(): Omit<ClockSyncStats, 'offset'> | undefined {
    if (!this.ready) return undefined
    return { rtt: this.lastRtt, bestRtt: this.best().rtt, samples: this.samples.length, frozen: this.frozen }
  }
}

type PlayerProbe = { lastPingAt: number; sent: number[]; rtts: number[] }

/**
 * Server-side bookkeeping: rate limits pings and keeps each player's acknowledged round trips.
 * @internal
 */
export class ServerClockRegistry {
  private readonly settings: ClockSyncOptions
  private players = new Map<string, PlayerProbe>()

  constructor(options: Partial<ClockSyncOptions> = {}) {
    this.settings = { ...CLOCK_SYNC_DEFAULTS, ...options }
  }

  private probe(from: string) {
    const key = from.toLowerCase()
    let probe = this.players.get(key)
    if (!probe) {
      probe = { lastPingAt: -Infinity, sent: [], rtts: [] }
      this.players.set(key, probe)
    }
    return probe
  }

  /** Returns false when the ping is rate limited. */
  onPing(from: string, now: number): boolean {
    const probe = this.probe(from)
    if (now - probe.lastPingAt < this.settings.serverMinPingIntervalMs) return false
    probe.lastPingAt = now
    return true
  }

  /** Records the stamp a pong left with, so its ack can be matched. */
  onPongSent(from: string, serverAt: number) {
    const probe = this.probe(from)
    probe.sent.push(serverAt)
    if (probe.sent.length > 4) probe.sent.shift()
  }

  /** `heldMs` is how long the client sat on the pong before acking; it is subtracted from the round trip. */
  onAck(from: string, serverAt: number, heldMs: number, now: number) {
    const probe = this.players.get(from.toLowerCase())
    const index = probe?.sent.indexOf(serverAt) ?? -1
    if (!probe || index === -1) return
    probe.sent.splice(0, index + 1)
    const elapsed = now - serverAt
    const rtt = elapsed - Math.max(0, Math.min(elapsed, heldMs))
    probe.rtts.push(Math.max(0, Math.min(this.settings.serverMaxRttMs, rtt)))
    if (probe.rtts.length > this.settings.serverLatencyWindow) probe.rtts.shift()
  }

  latency(from: string): number | undefined {
    const rtts = this.players.get(from.toLowerCase())?.rtts
    if (!rtts?.length) return undefined
    const sorted = [...rtts].sort((a, b) => a - b)
    const middle = sorted.length >> 1
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  }

  forget(from: string) {
    this.players.delete(from.toLowerCase())
  }

  prune(now: number) {
    for (const [key, probe] of this.players) {
      if (now - probe.lastPingAt > this.settings.serverForgetAfterMs) this.players.delete(key)
    }
  }

  clear() {
    this.players.clear()
  }
}

/** @internal */
export type ClockSyncComponents = {
  room: ClockRoom
  /** Emits an encoded custom event right away, bypassing the room queue so the stamp matches the departure. */
  emit: (data: Uint8Array, to?: string[]) => void
  isServer: () => boolean | null
}

/**
 * Wires the exchange onto a room. `flush` must run right before the transport hands its messages to comms, which
 * is where outgoing stamps are taken.
 * @internal
 */
export function createClockSync(
  { room, emit, isServer }: ClockSyncComponents,
  clocks: { wall: () => number; local: () => number } = { wall: () => Date.now(), local: monotonicClock() },
  options: Partial<ClockSyncOptions> = {}
) {
  const settings = { ...CLOCK_SYNC_DEFAULTS, ...options }
  const estimator = new ClockEstimator(settings)
  const registry = new ServerClockRegistry(settings)
  let lastPingAt = -Infinity
  let lastServerTime = -Infinity
  let outstanding: number[] = []
  const pendingAcks: { serverAt: number; arrivedAt: number }[] = []
  const pendingPongs: { to: string; clientAt: number; receivedAt: number }[] = []

  function send<K extends keyof ClockMessages>(eventType: K, data: EventTypes<ClockMessages>[K], to?: string[]) {
    emit(encodeEvent(eventType, data, CLOCK_SYNC_MESSAGES), to)
  }

  function reset() {
    estimator.reset()
    registry.clear()
    lastPingAt = -Infinity
    lastServerTime = -Infinity
    outstanding = []
    pendingAcks.length = 0
    pendingPongs.length = 0
  }

  room.onReady((ready) => {
    if (!ready) reset()
  })

  room.onMessage('__sdkClockPing', (data, context) => {
    if (!isServer() || !context) return
    const receivedAt = clocks.wall()
    if (!registry.onPing(context.from, receivedAt)) return
    pendingPongs.push({ to: context.from, clientAt: data.clientAt, receivedAt })
  })
  room.onMessage('__sdkClockAck', (data, context) => {
    if (!isServer() || !context) return
    registry.onAck(context.from, data.serverAt, data.heldMs, clocks.wall())
  })
  room.onMessage('__sdkClockPong', (data) => {
    if (isServer() !== false) return
    const arrivedAt = clocks.local()
    const index = outstanding.indexOf(data.clientAt)
    if (index === -1) return
    outstanding.splice(index, 1)
    if (estimator.addSample(data.clientAt, data.receivedAt, data.serverAt, arrivedAt)) {
      pendingAcks.push({ serverAt: data.serverAt, arrivedAt })
    }
  })

  function getServerTime(): number | undefined {
    if (isServer()) return clocks.wall()
    const local = clocks.local()
    const offset = estimator.offsetAt(local)
    if (offset === undefined) return undefined
    lastServerTime = Math.max(lastServerTime, local + offset)
    return lastServerTime
  }

  return {
    flush() {
      const server = isServer()
      if (server === null || !room.isReady()) return
      if (server) {
        const serverAt = clocks.wall()
        for (const pong of pendingPongs) {
          registry.onPongSent(pong.to, serverAt)
          send('__sdkClockPong', { clientAt: pong.clientAt, receivedAt: pong.receivedAt, serverAt }, [pong.to])
        }
        pendingPongs.length = 0
        registry.prune(serverAt)
        return
      }
      const t = clocks.local()
      for (const ack of pendingAcks) send('__sdkClockAck', { serverAt: ack.serverAt, heldMs: t - ack.arrivedAt })
      pendingAcks.length = 0
      if (t - lastPingAt < settings.pingIntervalMs) return
      lastPingAt = t
      outstanding = outstanding.filter((at) => t - at <= settings.maxRttMs)
      outstanding.push(t)
      send('__sdkClockPing', { clientAt: t })
    },
    /** Server clock in milliseconds since the epoch; never decreases until the room disconnects. */
    getServerTime,
    getStats(): ClockSyncStats | undefined {
      const stats = estimator.stats()
      const serverTime = getServerTime()
      if (!stats || serverTime === undefined) return undefined
      return { ...stats, offset: serverTime - clocks.wall() }
    },
    freeze: (frozen: boolean) => estimator.freeze(frozen),
    reset,
    /** Server only: median of a player's recent round trips in milliseconds, or undefined if never acknowledged. */
    getPlayerLatency: (userId: string) => registry.latency(userId),
    forgetPlayer: (userId: string) => registry.forget(userId)
  }
}

export type ClockSync = ReturnType<typeof createClockSync>
