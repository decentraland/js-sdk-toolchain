import { State, stateIterator } from '../../../packages/@dcl/crdt/src'

export function dataToString<T>(data: T) {
  if (data instanceof Uint8Array || data instanceof Buffer) {
    return new TextDecoder().decode(data)
  }
  return data!.toString()
}

export function stateFromString<T>(stateStr: string) {
  const state = JSON.parse(stateStr)
  const newState: State<T> = new Map()
  for (const value of state) {
    const { key1, key2, timestamp, data } = value
    if (!newState.has(key1)) {
      newState.set(key1, new Map())
    }
    newState.get(key1)!.set(key2, value !== null ? { timestamp, data } : null)
  }
  return newState
}

export function stateToString<T>(state: State<T>): string {
  const arr = []
  for (const [key1, key2, value] of stateIterator(state)) {
    arr.push({
      key1,
      key2,
      timestamp: value?.timestamp,
      data: dataToString(value?.data)
    })
  }
  return JSON.stringify(arr, null, 0)
}
