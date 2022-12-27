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
    const { componentId, entityId, timestamp, data } = value
    if (!newState.has(componentId)) {
      newState.set(componentId, new Map())
    }
    newState.get(componentId)!.set(entityId, value !== null ? { timestamp, data } : null)
  }
  return newState
}

export function stateToString<T>(state: State<T>): string {
  const arr = []
  for (const [componentId, entityId, value] of stateIterator(state)) {
    arr.push({
      componentId,
      entityId,
      timestamp: value?.timestamp,
      data: dataToString(value?.data)
    })
  }
  return JSON.stringify(arr, null, 0)
}
