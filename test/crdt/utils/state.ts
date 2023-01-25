import { State, stateIterator } from '../../../packages/@dcl/crdt/src'
import { createGSet } from '../../../packages/@dcl/crdt/src/gset'

export function dataToString<T>(data: T) {
  if (data === null) return null

  if (data instanceof Uint8Array || data instanceof Buffer) {
    return new TextDecoder().decode(data)
  }
  return data!.toString()
}

export function stateFromString<T>(stateStr: string) {
  const stateObject = JSON.parse(stateStr)
  const newState: State<T> = {
    components: new Map(),
    deletedEntities: createGSet()
  }

  const components = stateObject.components || []
  for (const value of components) {
    const { componentId, entityId, timestamp, data } = value
    if (!newState.components.has(componentId)) {
      newState.components.set(componentId, new Map())
    }
    newState.components.get(componentId)!.set(entityId, value !== null ? { timestamp, data } : null)
  }

  const deletedEntities = stateObject.components || []
  for (const value of deletedEntities) {
    const { entityNumber, entityVersion } = value
    newState.deletedEntities.addTo(entityNumber, entityVersion)
  }

  return newState
}

export function stateToString<T>(state: State<T>): string {
  const components = []
  for (const [componentId, entityId, value] of stateIterator(state)) {
    components.push({
      componentId,
      entityId,
      timestamp: value?.timestamp,
      data: dataToString(value?.data)
    })
  }

  const deletedEntities = []
  for (const [entityNumber, entityVersion] of state.deletedEntities.getMap()) {
    deletedEntities.push({
      entityNumber,
      entityVersion
    })
  }

  const stateObj = {
    components,
    deletedEntities: deletedEntities.sort((a, b) => {
      if (a.entityNumber === b.entityNumber) {
        return a.entityVersion - b.entityVersion
      }
      return a.entityNumber - b.entityNumber
    })
  }

  return JSON.stringify(stateObj, null, 0)
}
