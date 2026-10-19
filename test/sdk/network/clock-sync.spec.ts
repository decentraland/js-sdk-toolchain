import {
  ClockEstimator,
  ServerClockRegistry,
  createClockSync,
  CLOCK_SYNC_MESSAGES
} from '../../../packages/@dcl/sdk/src/network/clock-sync'
import { registerMessages } from '../../../packages/@dcl/sdk/src/network/events/implementation'
import type { EventContext } from '../../../packages/@dcl/sdk/src/network/events/implementation'
import { decodeEvent } from '../../../packages/@dcl/sdk/src/network/events/protocol'
import { Schemas } from '../../../packages/@dcl/ecs/dist'

type Listener = (data: any, context?: EventContext) => void
type Sent = { eventType: string; data: any; to?: string[] }

/** A room double that lets the test deliver messages and toggle readiness, plus an emitter that decodes. */
function fakeTransport() {
  let ready = true
  const listeners = new Map<string, Set<Listener>>()
  const readyListeners = new Set<(ready: boolean) => void>()
  const sent: Sent[] = []
  const room = {
    isReady: () => ready,
    onReady: (cb: (ready: boolean) => void) => {
      readyListeners.add(cb)
      return () => readyListeners.delete(cb)
    },
    onMessage: (eventType: string, cb: Listener) => {
      if (!listeners.has(eventType)) listeners.set(eventType, new Set())
      listeners.get(eventType)!.add(cb)
      return () => listeners.get(eventType)!.delete(cb)
    }
  }
  return {
    room,
    sent,
    emit: (buffer: Uint8Array, to?: string[]) => {
      const { eventType, payload } = decodeEvent(buffer, CLOCK_SYNC_MESSAGES)
      sent.push({ eventType: eventType as string, data: payload, to })
    },
    setReady(value: boolean) {
      ready = value
      readyListeners.forEach((cb) => cb(value))
    },
    deliver(eventType: string, data: any, context?: EventContext) {
      listeners.get(eventType)?.forEach((cb) => cb(data, context))
    }
  }
}

describe('ClockEstimator', () => {
  let estimator: ClockEstimator

  beforeEach(() => {
    estimator = new ClockEstimator({ windowSize: 3, maxRttMs: 2000, maxSlewRate: 0.05, snapThresholdMs: 1000 })
  })

  describe('when a sample arrives', () => {
    let offset: number | undefined

    beforeEach(() => {
      // true offset 4000, 100 ms each way, the server held the pong 20 ms before it left
      estimator.addSample(1000, 5100, 5120, 1220)
      offset = estimator.offsetAt(1220)
    })

    it('should estimate the offset with the server hold time taken out', () => {
      expect(offset).toBe(4000)
    })

    it('should report the round trip without the server hold time', () => {
      expect(estimator.stats()).toEqual({ rtt: 200, bestRtt: 200, samples: 1, frozen: false })
    })
  })

  describe('when several samples arrive with different round trips', () => {
    let offset: number | undefined

    beforeEach(() => {
      estimator.addSample(1000, 5100, 5100, 1200) // rtt 200, offset 4000
      estimator.addSample(2000, 6050, 6050, 2080) // rtt 80, offset 4010
      estimator.addSample(3000, 7150, 7150, 3500) // rtt 500, offset 3900
      offset = estimator.offsetAt(10_000)
    })

    it('should converge on the offset of the fastest round trip', () => {
      expect(offset).toBe(4010)
    })

    describe('and the window is full', () => {
      beforeEach(() => {
        estimator.addSample(4000, 8150, 8150, 4300)
      })

      it('should drop the oldest sample', () => {
        expect(estimator.stats()?.samples).toBe(3)
      })
    })
  })

  describe('when a better estimate arrives', () => {
    let offset: number | undefined

    beforeEach(() => {
      estimator.addSample(1000, 5100, 5100, 1200) // offset 4000
      estimator.addSample(2000, 6050, 6050, 2080) // offset 4010
      offset = estimator.offsetAt(1300)
    })

    it('should slew towards it at the maximum rate instead of jumping', () => {
      expect(offset).toBe(4005)
    })
  })

  describe('when a correction exceeds the snap threshold', () => {
    let offset: number | undefined

    beforeEach(() => {
      estimator.addSample(1000, 5100, 5100, 1200) // offset 4000
      estimator.addSample(2000, 8025, 8025, 2050) // rtt 50, offset 6000
      offset = estimator.offsetAt(2050)
    })

    it('should apply it at once', () => {
      expect(offset).toBe(6000)
    })
  })

  describe('when a reply is implausible', () => {
    let accepted: boolean

    describe('and its round trip is negative', () => {
      beforeEach(() => {
        accepted = estimator.addSample(1000, 5000, 5000, 900)
      })

      it('should reject it', () => {
        expect(accepted).toBe(false)
      })

      it('should stay not ready', () => {
        expect(estimator.ready).toBe(false)
      })
    })

    describe('and its round trip is above the maximum', () => {
      beforeEach(() => {
        accepted = estimator.addSample(1000, 5000, 5000, 3500)
      })

      it('should reject it', () => {
        expect(accepted).toBe(false)
      })
    })

    describe('and the server says the pong left before the ping arrived', () => {
      beforeEach(() => {
        accepted = estimator.addSample(1000, 5100, 5090, 1200)
      })

      it('should reject it', () => {
        expect(accepted).toBe(false)
      })
    })
  })

  describe('when the offset is frozen', () => {
    let offset: number | undefined

    beforeEach(() => {
      estimator.addSample(1000, 5100, 5100, 1200) // offset 4000
      estimator.freeze(true)
      estimator.addSample(2000, 6050, 6050, 2080) // offset 4010, the fastest
      estimator.freeze(true)
      offset = estimator.offsetAt(10_000)
    })

    it('should hold the offset it had even when freeze is requested again', () => {
      expect(offset).toBe(4000)
    })

    it('should flag the stats as frozen', () => {
      expect(estimator.stats()?.frozen).toBe(true)
    })

    describe('and then unfrozen', () => {
      beforeEach(() => {
        estimator.freeze(false)
        offset = estimator.offsetAt(10_100)
      })

      it('should slew towards the fresh estimate from where it was held', () => {
        expect(offset).toBe(4005)
      })
    })
  })

  describe('when a freeze is requested before the first sample', () => {
    let offset: number | undefined

    beforeEach(() => {
      estimator.freeze(true)
      estimator.addSample(1000, 5100, 5100, 1200) // offset 4000
      estimator.addSample(2000, 6050, 6050, 2080) // offset 4010
      offset = estimator.offsetAt(10_000)
    })

    it('should hold the first estimate', () => {
      expect(offset).toBe(4000)
    })
  })
})

describe('ServerClockRegistry', () => {
  let registry: ServerClockRegistry

  beforeEach(() => {
    registry = new ServerClockRegistry({
      serverMinPingIntervalMs: 800,
      serverMaxRttMs: 500,
      serverLatencyWindow: 5,
      serverForgetAfterMs: 30_000
    })
  })

  describe('when a client pings twice quickly', () => {
    let first: boolean
    let second: boolean

    beforeEach(() => {
      first = registry.onPing('0xabc', 10_000)
      second = registry.onPing('0xabc', 10_300)
    })

    it('should accept the first ping', () => {
      expect(first).toBe(true)
    })

    it('should rate limit the second ping', () => {
      expect(second).toBe(false)
    })
  })

  describe('when the client acknowledges a pong it was sent', () => {
    beforeEach(() => {
      registry.onPing('0xabc', 10_000)
      registry.onPongSent('0xabc', 10_020)
      registry.onAck('0xabc', 10_020, 30, 10_230)
    })

    it('should record the round trip without the time the client held the pong', () => {
      expect(registry.latency('0xabc')).toBe(180)
    })

    describe('and an ack arrives for a stamp that was never sent', () => {
      beforeEach(() => {
        registry.onAck('0xabc', 9_999, 0, 10_400)
      })

      it('should ignore it', () => {
        expect(registry.latency('0xabc')).toBe(180)
      })
    })

    describe('and the player is forgotten', () => {
      beforeEach(() => {
        registry.forget('0xAbC')
      })

      it('should no longer know its latency', () => {
        expect(registry.latency('0xabc')).toBeUndefined()
      })
    })

    describe('and the player stops pinging for longer than the forget delay', () => {
      beforeEach(() => {
        registry.prune(40_001)
      })

      it('should no longer know its latency', () => {
        expect(registry.latency('0xabc')).toBeUndefined()
      })
    })
  })

  describe('when a round trip is absurd', () => {
    beforeEach(() => {
      registry.onPing('0xabc', 20_000)
      registry.onPongSent('0xabc', 20_000)
      registry.onAck('0xabc', 20_000, 0, 21_900)
    })

    it('should clamp it to the maximum', () => {
      expect(registry.latency('0xabc')).toBe(500)
    })
  })

  describe('when one ack in the window is delayed', () => {
    beforeEach(() => {
      ;[100, 110, 900, 105, 120].forEach((rtt, i) => {
        const serverAt = 10_000 + i * 1000
        registry.onPing('0xabc', serverAt)
        registry.onPongSent('0xabc', serverAt)
        registry.onAck('0xabc', serverAt, 0, serverAt + rtt)
      })
    })

    it('should report the median so the spike does not widen the window', () => {
      expect(registry.latency('0xabc')).toBe(110)
    })
  })
})

describe('createClockSync', () => {
  let transport: ReturnType<typeof fakeTransport>
  let sync: ReturnType<typeof createClockSync>
  let wall: number
  let local: number

  beforeEach(() => {
    transport = fakeTransport()
  })

  describe('when running on a client', () => {
    beforeEach(() => {
      wall = 1_000_000
      local = 100_000
      sync = createClockSync(
        { room: transport.room as any, emit: transport.emit, isServer: () => false },
        { wall: () => wall, local: () => local },
        { pingIntervalMs: 1500 }
      )
    })

    describe('and no reply has arrived', () => {
      it('should not know the server time', () => {
        expect(sync.getServerTime()).toBeUndefined()
      })
    })

    describe('and the transport flushes for the first time', () => {
      beforeEach(() => {
        sync.flush()
      })

      it('should send a ping stamped with the local clock', () => {
        expect(transport.sent).toEqual([{ eventType: '__sdkClockPing', data: { clientAt: 100_000 }, to: undefined }])
      })
    })

    describe('and the transport flushes again before the interval elapses', () => {
      beforeEach(() => {
        sync.flush()
        local += 1000
        sync.flush()
      })

      it('should not ping again', () => {
        expect(transport.sent).toHaveLength(1)
      })
    })

    describe('and the transport flushes again once the interval elapsed', () => {
      beforeEach(() => {
        sync.flush()
        local += 1500
        sync.flush()
      })

      it('should ping again', () => {
        expect(transport.sent.map((m) => m.data.clientAt)).toEqual([100_000, 101_500])
      })
    })

    describe('and the room is not ready', () => {
      beforeEach(() => {
        transport.setReady(false)
        sync.flush()
      })

      it('should not ping', () => {
        expect(transport.sent).toHaveLength(0)
      })
    })

    describe('and the server replies to a ping', () => {
      beforeEach(() => {
        sync.flush()
        local = 100_220
        wall = 1_000_220
        transport.deliver('__sdkClockPong', { clientAt: 100_000, receivedAt: 500_100, serverAt: 500_120 })
      })

      it('should estimate the server time from the reply', () => {
        expect(sync.getServerTime()).toBe(500_220)
      })

      it('should report the offset against Date.now()', () => {
        expect(sync.getStats()?.offset).toBe(500_220 - 1_000_220)
      })

      describe('and the transport flushes', () => {
        beforeEach(() => {
          local = 100_250
          sync.flush()
        })

        it('should acknowledge the server stamp with the time it held the pong', () => {
          expect(transport.sent[1]).toEqual({
            eventType: '__sdkClockAck',
            data: { serverAt: 500_120, heldMs: 30 },
            to: undefined
          })
        })
      })

      describe('and a faster reply asks for a large backwards correction', () => {
        let before: number | undefined
        let after: number | undefined

        beforeEach(() => {
          before = sync.getServerTime()
          local = 101_500
          sync.flush()
          local = 101_550
          transport.deliver('__sdkClockPong', { clientAt: 101_500, receivedAt: 499_525, serverAt: 499_525 })
          after = sync.getServerTime()
        })

        it('should never return an earlier server time', () => {
          expect(after).toBe(before)
        })
      })

      describe('and the room disconnects', () => {
        beforeEach(() => {
          transport.setReady(false)
        })

        it('should forget the estimate', () => {
          expect(sync.getServerTime()).toBeUndefined()
        })
      })
    })

    describe('and a reply arrives after a newer ping was sent', () => {
      beforeEach(() => {
        sync.flush() // ping at 100_000
        local = 101_500
        sync.flush() // ping at 101_500
        local = 101_700
        transport.deliver('__sdkClockPong', { clientAt: 100_000, receivedAt: 500_850, serverAt: 500_850 })
      })

      it('should still use it', () => {
        expect(sync.getServerTime()).toBe(501_700)
      })
    })

    describe('and a reply arrives for a ping that was never sent', () => {
      beforeEach(() => {
        sync.flush()
        local = 100_200
        transport.deliver('__sdkClockPong', { clientAt: 12_345, receivedAt: 500_100, serverAt: 500_100 })
      })

      it('should ignore it', () => {
        expect(sync.getServerTime()).toBeUndefined()
      })
    })

    describe('and someone pings it', () => {
      beforeEach(() => {
        transport.deliver('__sdkClockPing', { clientAt: 1 }, { from: '0xother' })
        sync.flush()
      })

      it('should not answer', () => {
        expect(transport.sent.map((m) => m.eventType)).toEqual(['__sdkClockPing'])
      })
    })
  })

  describe('when running on the server', () => {
    beforeEach(() => {
      wall = 500_000
      local = 7
      sync = createClockSync(
        { room: transport.room as any, emit: transport.emit, isServer: () => true },
        { wall: () => wall, local: () => local }
      )
    })

    describe('and the transport flushes', () => {
      beforeEach(() => {
        sync.flush()
      })

      it('should not ping', () => {
        expect(transport.sent).toHaveLength(0)
      })
    })

    describe('and the scene reads the server time', () => {
      it('should return its own clock', () => {
        expect(sync.getServerTime()).toBe(500_000)
      })
    })

    describe('and a client pings', () => {
      beforeEach(() => {
        transport.deliver('__sdkClockPing', { clientAt: 100_000 }, { from: '0xAbC' })
      })

      it('should hold the pong until the transport flushes', () => {
        expect(transport.sent).toHaveLength(0)
      })

      describe('and the transport flushes', () => {
        beforeEach(() => {
          wall = 500_016
          sync.flush()
        })

        it('should answer only that client with the arrival and departure stamps', () => {
          expect(transport.sent).toEqual([
            {
              eventType: '__sdkClockPong',
              data: { clientAt: 100_000, receivedAt: 500_000, serverAt: 500_016 },
              to: ['0xAbC']
            }
          ])
        })

        describe('and the client acknowledges', () => {
          beforeEach(() => {
            wall = 500_200
            transport.deliver('__sdkClockAck', { serverAt: 500_016, heldMs: 34 }, { from: '0xAbC' })
          })

          it('should record its round trip without the client hold time', () => {
            expect(sync.getPlayerLatency('0xabc')).toBe(150)
          })
        })
      })

      describe('and pings again within the rate limit', () => {
        beforeEach(() => {
          sync.flush()
          wall = 500_300
          transport.deliver('__sdkClockPing', { clientAt: 100_300 }, { from: '0xAbC' })
          sync.flush()
        })

        it('should not answer the second ping', () => {
          expect(transport.sent).toHaveLength(1)
        })
      })
    })

    describe('and a ping arrives without sender context', () => {
      beforeEach(() => {
        transport.deliver('__sdkClockPing', { clientAt: 100_000 })
        sync.flush()
      })

      it('should ignore it', () => {
        expect(transport.sent).toHaveLength(0)
      })
    })

    describe('and a player never acknowledged', () => {
      it('should not know its latency', () => {
        expect(sync.getPlayerLatency('0xnobody')).toBeUndefined()
      })
    })
  })
})

describe('registerMessages', () => {
  describe('when a scene registers a reserved message name', () => {
    let register: () => void

    beforeEach(() => {
      register = () => registerMessages({ __sdkClockPing: Schemas.Map({ hijack: Schemas.Boolean }) })
    })

    it('should throw naming the reserved message', () => {
      expect(register).toThrow("Message names starting with '__sdk' are reserved: __sdkClockPing")
    })
  })
})
