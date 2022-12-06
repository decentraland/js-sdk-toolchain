import { sameData, State, stateIterator } from '../../../packages/@dcl/crdt/src'

/**
 * Compare buffer data
 * @internal
 */
export function compareData(a: unknown, b: unknown) {
  return sameData(a, b)
}

/**
 * Compare state between clients
 * @internal
 */
export function compareStatePayloads<T = Buffer>(states: State<T>[]) {
  if (!states.length) {
    return true
  }

  const baseState = states[0]

  for (const state of states) {
    // Compare key1 keys map size
    if (state.size !== baseState.size) {
      return false
    }

    // Compare inside key1 the key2 keys map size
    for (const key1 of baseState.keys()) {
      if (state.get(key1)?.size !== baseState.get(key1)!.size) {
        return false
      }
    }

    // Compare each <key1, key2> exists and the { timestamp, data } is the same
    for (const [key1, key2, baseStatePayload] of stateIterator(baseState)) {
      const currentStatePayload = state.get(key1)?.get(key2)
      const isDifferent =
        !currentStatePayload ||
        currentStatePayload.timestamp !== baseStatePayload?.timestamp ||
        !compareData(currentStatePayload.data, baseStatePayload.data)

      if (isDifferent) {
        return false
      }
    }
  }

  return true
}

/**
 * Fake sleep ms network
 * @internal
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Shuffle an array of unknonw values without mutation
 * @internal
 */
export function shuffle<T = unknown>(value: T[]) {
  return value
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
}
