import {
  ClockEstimator,
  ServerClockRegistry,
  createClockSync,
  CLOCK_SYNC_MESSAGES
} from '../../../packages/@dcl/sdk/src/network/clock-sync'
import type { Room, EventContext } from '../../../packages/@dcl/sdk/src/network/events/implementation'

type ClockRoom = Room<typeof CLOCK_SYNC_MESSAGES>
type Listener = (data: any, context?: EventContext) => void

/** A room double that records sends and lets the test deliver messages to listeners. */
function fakeRoom(initiallyReady = true) {
  let ready = initiallyReady
  const listeners = new Map<string, Set<Listener>>()
  const sent: { eventType: string; data: any; options?: { to?: string[] } }[] = []
  const room = {
    isReady: () => ready,
    setReady: (value: boolean) => {
      ready = value
    },
    send: jest.fn(async (eventType: string, data: any, options?: { to?: string[] }) => {
      sent.push({ eventType, data, options })
    }),
    onMessage: jest.fn((eventType: string, cb: Listener) => {
      if (!listeners.has(eventType)) listeners.set(eventType, new Set())
      listeners.get(eventType)!.add(cb)
      return () => listeners.get(eventType)!.delete(cb)
    }),
    deliver(eventType: string, data: any, context?: EventContext) {
      listeners.get(eventType)?.forEach((cb) => cb(data, context))
    },
    sent
  }
  return room
}

describe('ClockEstimator', () => {
  let estimator: ClockEstimator

  beforeEach(() => {
    estimator = new ClockEstimator(3, 2000)
  })

  describe('when a pong arrives', () => {
    beforeEach(() => {
      // ping at 1000, server answered at 5100, reply received at 1200: rtt 200, offset 5100 - 1100 = 4000
      estimator.addSample(1000, 5100, 1200)
    })

    it('should estimate the offset from the midpoint of the round trip', () => {
      expect(estimator.offset).toBe(4000)
    })

    it('should report the sample count and round trip', () => {
      expect(estimator.stats()).toEqual({ offset: 4000, rtt: 200, bestRtt: 200, samples: 1, frozen: false })
    })
  })

  describe('when several pongs arrive with different round trips', () => {
    beforeEach(() => {
      estimator.addSample(1000, 5100, 1200) // rtt 200, offset 4000
      estimator.addSample(2000, 6250, 2500) // rtt 500, offset 4000 - but noisier: 6250 - 2250 = 4000
      estimator.addSample(3000, 7040, 3080) // rtt 80, offset 7040 - 3040 = 4000
    })

    it('should pick the offset from the fastest round trip', () => {
      expect(estimator.stats()?.bestRtt).toBe(80)
    })

    it('should drop the oldest sample once the window is full', () => {
      estimator.addSample(4000, 8150, 4300) // rtt 300, offset 4000
      expect(estimator.stats()?.samples).toBe(3)
    })
  })

  describe('when a reply is implausible', () => {
    it('should reject a negative round trip', () => {
      expect(estimator.addSample(1000, 5000, 900)).toBe(false)
    })

    it('should reject a round trip above the maximum', () => {
      expect(estimator.addSample(1000, 5000, 3500)).toBe(false)
    })

    it('should stay not ready without an accepted sample', () => {
      estimator.addSample(1000, 5000, 900)
      expect(estimator.ready).toBe(false)
    })
  })

  describe('when the offset is frozen', () => {
    beforeEach(() => {
      estimator.addSample(1000, 5100, 1200) // rtt 200, offset 4000
      estimator.freeze(true)
      estimator.addSample(3000, 7120, 3040) // rtt 40, offset 7120 - 3020 = 4100: the fastest, so the live estimate moves
    })

    it('should keep reporting the offset it had when frozen', () => {
      expect(estimator.offset).toBe(4000)
    })

    it('should flag the stats as frozen', () => {
      expect(estimator.stats()?.frozen).toBe(true)
    })

    it('should switch to the fresh estimate once unfrozen', () => {
      estimator.freeze(false)
      expect(estimator.offset).toBe(4100)
    })
  })
})

describe('ServerClockRegistry', () => {
  let registry: ServerClockRegistry

  beforeEach(() => {
    registry = new ServerClockRegistry(800, 500)
  })

  describe('when a client pings twice quickly', () => {
    let first: number | undefined
    let second: number | undefined

    beforeEach(() => {
      first = registry.onPing('0xabc', 10_000)
      second = registry.onPing('0xabc', 10_300)
    })

    it('should answer the first ping with the server stamp', () => {
      expect(first).toBe(10_000)
    })

    it('should rate limit the second ping', () => {
      expect(second).toBeUndefined()
    })
  })

  describe('when the client acknowledges the stamp it was sent', () => {
    beforeEach(() => {
      registry.onPing('0xabc', 10_000)
      registry.onAck('0xabc', 10_000, 10_180)
    })

    it('should record that player round trip', () => {
      expect(registry.latency('0xabc')).toBe(180)
    })

    it('should ignore an ack for a stamp that was never sent', () => {
      registry.onAck('0xabc', 9_999, 10_400)
      expect(registry.latency('0xabc')).toBe(180)
    })

    it('should clamp an absurd round trip', () => {
      registry.onPing('0xabc', 20_000)
      registry.onAck('0xabc', 20_000, 21_900)
      expect(registry.latency('0xabc')).toBe(500)
    })

    it('should forget the player on request', () => {
      registry.forget('0xabc')
      expect(registry.latency('0xabc')).toBeUndefined()
    })
  })
})

describe('createClockSync', () => {
  let now: number
  const clock = () => now

  describe('when running on a client', () => {
    let room: ReturnType<typeof fakeRoom>
    let sync: ReturnType<typeof createClockSync>

    beforeEach(() => {
      now = 100_000
      room = fakeRoom(true)
      sync = createClockSync(room as unknown as ClockRoom, () => false, clock, { pingIntervalMs: 1500 })
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should not know the server time before any reply', () => {
      expect(sync.getServerTime()).toBeUndefined()
    })

    it('should send a ping stamped with the local clock on the first update', () => {
      sync.update()
      expect(room.sent).toEqual([{ eventType: '__sdkClockPing', data: { clientAt: 100_000 }, options: undefined }])
    })

    it('should not ping again before the interval elapses', () => {
      sync.update()
      now += 1000
      sync.update()
      expect(room.sent).toHaveLength(1)
    })

    it('should ping again once the interval elapsed', () => {
      sync.update()
      now += 1500
      sync.update()
      expect(room.sent.map((m) => m.data.clientAt)).toEqual([100_000, 101_500])
    })

    it('should not ping while the room is not ready', () => {
      room.setReady(false)
      sync.update()
      expect(room.sent).toHaveLength(0)
    })

    describe('and the server replies to the latest ping', () => {
      beforeEach(() => {
        sync.update() // ping at 100_000
        now = 100_200
        room.deliver('__sdkClockPong', { clientAt: 100_000, serverAt: 500_100 })
      })

      it('should estimate the server time from the reply', () => {
        // offset = 500_100 - (100_000 + 100) = 400_000
        expect(sync.getServerTime()).toBe(500_200)
      })

      it('should acknowledge the server stamp so the server can measure its round trip', () => {
        expect(room.sent[1]).toEqual({ eventType: '__sdkClockAck', data: { serverAt: 500_100 }, options: undefined })
      })

      it('should expose the measured round trip', () => {
        expect(sync.getStats()?.rtt).toBe(200)
      })
    })

    describe('and a reply to an older ping arrives', () => {
      beforeEach(() => {
        sync.update() // ping at 100_000
        now = 101_500
        sync.update() // ping at 101_500 (the pending one)
        now = 101_600
        room.deliver('__sdkClockPong', { clientAt: 100_000, serverAt: 500_100 })
      })

      it('should ignore the stale reply', () => {
        expect(sync.getServerTime()).toBeUndefined()
      })
    })

    describe('and the offset is frozen', () => {
      beforeEach(() => {
        sync.update()
        now = 100_200
        room.deliver('__sdkClockPong', { clientAt: 100_000, serverAt: 500_100 }) // offset 400_000
        sync.freeze(true)
        now = 101_500
        sync.update()
        now = 101_540
        room.deliver('__sdkClockPong', { clientAt: 101_500, serverAt: 501_570 }) // rtt 40, offset 400_050
      })

      it('should keep the frozen offset', () => {
        expect(sync.getServerTime()).toBe(101_540 + 400_000)
      })

      it('should adopt the newer estimate after unfreezing', () => {
        sync.freeze(false)
        expect(sync.getServerTime()).toBe(101_540 + 400_050)
      })
    })

    it('should never answer pings itself', () => {
      room.deliver('__sdkClockPing', { clientAt: 1 }, { from: '0xother' })
      expect(room.sent).toHaveLength(0)
    })
  })

  describe('when running on the server', () => {
    let room: ReturnType<typeof fakeRoom>
    let sync: ReturnType<typeof createClockSync>

    beforeEach(() => {
      now = 500_000
      room = fakeRoom(true)
      sync = createClockSync(room as unknown as ClockRoom, () => true, clock)
    })

    it('should never ping', () => {
      sync.update()
      expect(room.sent).toHaveLength(0)
    })

    describe('and a client pings', () => {
      beforeEach(() => {
        room.deliver('__sdkClockPing', { clientAt: 100_000 }, { from: '0xAbC' })
      })

      it('should answer only that client with both stamps', () => {
        expect(room.sent).toEqual([
          { eventType: '__sdkClockPong', data: { clientAt: 100_000, serverAt: 500_000 }, options: { to: ['0xAbC'] } }
        ])
      })

      it('should record the round trip when the client acknowledges', () => {
        now = 500_150
        room.deliver('__sdkClockAck', { serverAt: 500_000 }, { from: '0xAbC' })
        expect(sync.getPlayerLatency('0xabc')).toBe(150)
      })

      it('should rate limit a second ping from the same client', () => {
        now = 500_300
        room.deliver('__sdkClockPing', { clientAt: 100_300 }, { from: '0xAbC' })
        expect(room.sent).toHaveLength(1)
      })
    })

    it('should ignore a ping without sender context', () => {
      room.deliver('__sdkClockPing', { clientAt: 100_000 })
      expect(room.sent).toHaveLength(0)
    })

    it('should not know a latency for a player that never acknowledged', () => {
      expect(sync.getPlayerLatency('0xnobody')).toBeUndefined()
    })
  })
})
