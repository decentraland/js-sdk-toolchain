import { IEngine } from '../../engine/types'

export type TimerId = number

export type TimerCallback = () => void

export type Timers = {
  /**
   * Delays the execution of a function by a given amount of milliseconds.
   *
   * @param callback - The function to execute after the delay
   * @param ms - The delay in milliseconds
   * @returns A TimerId that can be used to cancel the timeout
   *
   * @example
   * ```ts
   * const timeoutId = timers.setTimeout(() => {
   *   console.log('1 second passed')
   * }, 1000)
   * ```
   */
  setTimeout(callback: TimerCallback, ms: number): TimerId

  /**
   * Cancels a timeout previously established by setTimeout.
   *
   * @param timerId - The TimerId returned by setTimeout
   *
   * @example
   * ```ts
   * const timeoutId = timers.setTimeout(() => {
   *   console.log('This will not run')
   * }, 1000)
   *
   * timers.clearTimeout(timeoutId)
   * ```
   */
  clearTimeout(timerId: TimerId): void

  /**
   * Repeatedly executes a function at specified intervals.
   *
   * @param callback - The function to execute at each interval
   * @param ms - The interval in milliseconds
   * @returns A TimerId that can be used to cancel the interval
   *
   * @example
   * ```ts
   * const intervalId = timers.setInterval(() => {
   *   console.log('Printing this every 1 second')
   * }, 1000)
   * ```
   */
  setInterval(callback: TimerCallback, ms: number): TimerId

  /**
   * Cancels an interval previously established by setInterval.
   *
   * @param timerId - The TimerId returned by setInterval
   *
   * @example
   * ```ts
   * const intervalId = timers.setInterval(() => {
   *   console.log('This will stop')
   * }, 1000)
   *
   * timers.clearInterval(intervalId)
   * ```
   */
  clearInterval(timerId: TimerId): void
}

type TimerData = {
  callback: TimerCallback
  accumulatedTime: number
  interval: number
  recurrent: boolean
}

/**
 * Creates a timer system bound to a specific engine instance.
 *
 * @param targetEngine - The engine instance to bind timers to
 * @returns A Timers object with setTimeout, clearTimeout, setInterval, and clearInterval methods
 *
 * @example
 * ```ts
 * import { Engine } from '@dcl/sdk/ecs'
 * import { createTimers } from '@dcl/sdk/ecs'
 *
 * const engine = Engine()
 * const timers = createTimers(engine)
 *
 * timers.setTimeout(() => console.log('done'), 1000)
 * ```
 *
 * @public
 */
export function createTimers(targetEngine: IEngine): Timers {
  const timers: Map<TimerId, TimerData> = new Map()
  let timerIdCounter = 0

  function system(dt: number) {
    for (const [timerId, timerData] of timers) {
      timerData.accumulatedTime += 1000 * dt

      if (timerData.accumulatedTime < timerData.interval) {
        continue
      }

      if (timerData.recurrent) {
        // For intervals, subtract full interval periods to handle accumulated time
        const fullIntervals = Math.floor(timerData.accumulatedTime / timerData.interval)
        timerData.accumulatedTime -= fullIntervals * timerData.interval
      } else {
        timers.delete(timerId)
      }

      timerData.callback()
    }
  }

  targetEngine.addSystem(system, Number.MAX_SAFE_INTEGER, '@dcl/ecs/timers')

  return {
    setTimeout(callback: TimerCallback, ms: number): TimerId {
      const timerId = timerIdCounter++
      timers.set(timerId, {
        callback,
        interval: ms,
        recurrent: false,
        accumulatedTime: 0
      })
      return timerId
    },

    clearTimeout(timerId: TimerId): void {
      timers.delete(timerId)
    },

    setInterval(callback: TimerCallback, ms: number): TimerId {
      const timerId = timerIdCounter++
      timers.set(timerId, {
        callback,
        interval: ms,
        recurrent: true,
        accumulatedTime: 0
      })
      return timerId
    },

    clearInterval(timerId: TimerId): void {
      timers.delete(timerId)
    }
  }
}
