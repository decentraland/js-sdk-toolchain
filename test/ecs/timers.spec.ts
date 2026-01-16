import { Engine, createTimers, TimerId } from '../../packages/@dcl/ecs/src'

describe('Timer helpers', () => {
  describe('setTimeout', () => {
    it('should execute callback after specified time', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let called = false

      timers.setTimeout(() => {
        called = true
      }, 1000)

      expect(called).toBe(false)
      await engine.update(0.5) // 500ms - not enough time
      expect(called).toBe(false)
      await engine.update(0.6) // 600ms more = 1100ms total
      expect(called).toBe(true)
    })

    it('should only execute callback once', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let count = 0

      timers.setTimeout(() => {
        count++
      }, 500)

      await engine.update(0.5) // 500ms - triggers
      expect(count).toBe(1)
      await engine.update(0.5) // 1000ms
      expect(count).toBe(1)
      await engine.update(0.5) // 1500ms
      expect(count).toBe(1)
    })

    it('should return a TimerId', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      const id: TimerId = timers.setTimeout(() => {}, 1000)
      expect(typeof id).toBe('number')
    })

    it('should handle zero delay', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let called = false

      timers.setTimeout(() => {
        called = true
      }, 0)

      expect(called).toBe(false)
      await engine.update(0.001) // Any small update should trigger it
      expect(called).toBe(true)
    })

    it('should handle multiple timeouts', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      const order: number[] = []

      timers.setTimeout(() => order.push(1), 100)
      timers.setTimeout(() => order.push(2), 200)
      timers.setTimeout(() => order.push(3), 150)

      await engine.update(0.25) // 250ms - all should trigger (order is by Map iteration)
      expect(order).toEqual([1, 2, 3])
    })
  })

  describe('clearTimeout', () => {
    it('should cancel a pending timeout', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let called = false

      const id = timers.setTimeout(() => {
        called = true
      }, 1000)

      timers.clearTimeout(id)
      await engine.update(2) // 2000ms
      expect(called).toBe(false)
    })

    it('should not affect other timeouts', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let called1 = false
      let called2 = false

      const id1 = timers.setTimeout(() => {
        called1 = true
      }, 500)
      timers.setTimeout(() => {
        called2 = true
      }, 500)

      timers.clearTimeout(id1)
      await engine.update(1)

      expect(called1).toBe(false)
      expect(called2).toBe(true)
    })

    it('should handle clearing non-existent timer', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      // Should not throw
      timers.clearTimeout(99999)
    })

    it('should handle clearing already executed timeout', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let count = 0

      const id = timers.setTimeout(() => {
        count++
      }, 100)

      await engine.update(0.2) // Execute timeout
      expect(count).toBe(1)

      // Should not throw
      timers.clearTimeout(id)
    })
  })

  describe('setInterval', () => {
    it('should execute callback repeatedly at specified interval', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let count = 0

      timers.setInterval(() => {
        count++
      }, 500)

      await engine.update(0.5) // 500ms
      expect(count).toBe(1)
      await engine.update(0.5) // 1000ms
      expect(count).toBe(2)
      await engine.update(0.5) // 1500ms
      expect(count).toBe(3)
    })

    it('should return a TimerId', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      const id: TimerId = timers.setInterval(() => {}, 1000)
      expect(typeof id).toBe('number')
    })

    it('should handle multiple intervals', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let count1 = 0
      let count2 = 0

      timers.setInterval(() => count1++, 100)
      timers.setInterval(() => count2++, 200)

      // Each frame triggers at most once per interval
      await engine.update(0.1) // 100ms - count1 triggers
      expect(count1).toBe(1)
      expect(count2).toBe(0)

      await engine.update(0.1) // 200ms - both trigger
      expect(count1).toBe(2)
      expect(count2).toBe(1)

      await engine.update(0.1) // 300ms - count1 triggers
      expect(count1).toBe(3)
      expect(count2).toBe(1)

      await engine.update(0.1) // 400ms - both trigger
      expect(count1).toBe(4)
      expect(count2).toBe(2)
    })

    it('should handle interval with accumulated time', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let count = 0

      timers.setInterval(() => {
        count++
      }, 100)

      // One big update - triggers once per frame, but accumulated time carries over
      await engine.update(0.35) // 350ms - triggers once, 50ms carries over
      expect(count).toBe(1)

      await engine.update(0.06) // 60ms more = 110ms accumulated - triggers again
      expect(count).toBe(2)
    })
  })

  describe('clearInterval', () => {
    it('should stop a running interval', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let count = 0

      const id = timers.setInterval(() => {
        count++
      }, 500)

      await engine.update(0.5)
      expect(count).toBe(1)

      timers.clearInterval(id)

      await engine.update(1)
      expect(count).toBe(1) // Should not increase
    })

    it('should not affect other intervals', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let count1 = 0
      let count2 = 0

      const id1 = timers.setInterval(() => count1++, 100)
      timers.setInterval(() => count2++, 100)

      await engine.update(0.1) // Both trigger once
      expect(count1).toBe(1)
      expect(count2).toBe(1)

      await engine.update(0.1) // Both trigger again
      expect(count1).toBe(2)
      expect(count2).toBe(2)

      timers.clearInterval(id1)

      await engine.update(0.1)
      expect(count1).toBe(2) // Stopped
      expect(count2).toBe(3) // Continues

      await engine.update(0.1)
      expect(count1).toBe(2) // Still stopped
      expect(count2).toBe(4) // Still continues
    })
  })

  describe('Timer system per engine', () => {
    it('should maintain separate timer states for different engines', async () => {
      const engine1 = Engine()
      const engine2 = Engine()
      const timers1 = createTimers(engine1)
      const timers2 = createTimers(engine2)
      let count1 = 0
      let count2 = 0

      timers1.setTimeout(() => count1++, 100)
      timers2.setTimeout(() => count2++, 100)

      await engine1.update(0.2)
      expect(count1).toBe(1)
      expect(count2).toBe(0) // engine2 not updated yet

      await engine2.update(0.2)
      expect(count2).toBe(1)
    })

    it('should not cross-cancel timers between engines', async () => {
      const engine1 = Engine()
      const engine2 = Engine()
      const timers1 = createTimers(engine1)
      const timers2 = createTimers(engine2)
      let called = false

      const id = timers1.setTimeout(() => {
        called = true
      }, 100)

      // Try to clear from wrong timers instance
      timers2.clearTimeout(id)

      await engine1.update(0.2)
      expect(called).toBe(true) // Should still execute
    })
  })

  describe('Edge cases', () => {
    it('should handle very small delta times', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let called = false

      timers.setTimeout(() => {
        called = true
      }, 100)

      // Many small updates
      for (let i = 0; i < 100; i++) {
        await engine.update(0.001) // 1ms each = 100ms total
      }

      expect(called).toBe(true)
    })

    it('should handle callback that schedules another timer', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      const order: number[] = []

      timers.setTimeout(() => {
        order.push(1)
        timers.setTimeout(() => {
          order.push(2)
        }, 100)
      }, 100)

      await engine.update(0.1) // Both callbacks fire in the same frame
      expect(order).toEqual([1, 2])
    })

    it('should handle interval that clears itself', async () => {
      const engine = Engine()
      const timers = createTimers(engine)
      let count = 0
      const intervalId: TimerId = timers.setInterval(() => {
        count++
        if (count >= 3) {
          timers.clearInterval(intervalId)
        }
      }, 100)

      // Multiple frames to allow the interval to fire and clear itself
      await engine.update(0.1) // 100ms - triggers once (count=1)
      expect(count).toBe(1)

      await engine.update(0.1) // 200ms - triggers again (count=2)
      expect(count).toBe(2)

      await engine.update(0.1) // 300ms - triggers and clears itself (count=3)
      expect(count).toBe(3)

      await engine.update(0.1) // 400ms - should not trigger (cleared)
      expect(count).toBe(3)
    })
  })
})
