/**
 * Convergence oracle.
 *
 * Compares engines semantically: every NetworkEntity-tagged entity is keyed by
 * its network identity (`networkId:entityId`, the identity that survives the
 * wire) instead of its local `Entity` id, and every syncable component value on
 * it is compared across engines. Local-only entities are ignored on purpose —
 * they are invisible to the network layer.
 */
import {
  ComponentDefinition,
  Entity,
  IEngine,
  INetowrkEntity,
  NetworkEntity as _NetworkEntity
} from '../../../../packages/@dcl/ecs'
import { shouldSyncComponent } from '../../../../packages/@dcl/sdk/src/network/state'
import { toHex } from './hex'

/** Components that carry no scene state worth comparing. */
const IGNORED = [
  // redundant: it is the comparison key itself
  'core-schema::Network-Entity',
  // server-only bookkeeping, written by the validator when it first sees an entity
  'core-schema::Created-By'
]

export type NetworkSnapshot = Record<string, Record<string, string>>

/**
 * Key order is not semantic: a locally created value keeps the order the scene
 * wrote it in, a deserialized one follows the schema, so keys are sorted before
 * comparing.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : 1))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

function componentValue(component: ComponentDefinition<unknown>, entity: Entity): string {
  try {
    return stableStringify(component.get(entity))
  } catch {
    // GrowOnlyValueSet-like components: fall back to the serialized CRDT state
    const state = component.getCrdtState(entity)
    return state ? toHex(state.data) : 'null'
  }
}

export function networkSnapshot(engine: IEngine, ignore: string[] = []): NetworkSnapshot {
  const NetworkEntity = engine.getComponent(_NetworkEntity.componentId) as INetowrkEntity
  const snapshot: NetworkSnapshot = {}
  for (const [entity, network] of engine.getEntitiesWith(NetworkEntity)) {
    const values: Record<string, string> = {}
    for (const component of engine.componentsIter()) {
      if (!shouldSyncComponent(component)) continue
      if (IGNORED.includes(component.componentName) || ignore.includes(component.componentName)) continue
      if (!component.has(entity)) continue
      values[component.componentName] = componentValue(component, entity)
    }
    snapshot[`${network.networkId}:${network.entityId}`] = values
  }
  return snapshot
}

/**
 * Throws with a readable diff unless every engine holds the same network state.
 * The first engine of the record is the reference.
 */
export function expectConvergence(engines: Record<string, IEngine>, ignore: string[] = []): void {
  const snapshots = Object.entries(engines).map(([name, engine]) => [name, networkSnapshot(engine, ignore)] as const)
  const [referenceName, reference] = snapshots[0]
  const diffs: string[] = []

  for (const [name, snapshot] of snapshots.slice(1)) {
    const keys = new Set([...Object.keys(reference), ...Object.keys(snapshot)])
    for (const key of Array.from(keys).sort()) {
      const left = reference[key]
      const right = snapshot[key]
      if (!left) {
        diffs.push(`  entity ${key}: missing in ${referenceName}, present in ${name} (${JSON.stringify(right)})`)
        continue
      }
      if (!right) {
        diffs.push(`  entity ${key}: present in ${referenceName} (${JSON.stringify(left)}), missing in ${name}`)
        continue
      }
      const componentNames = new Set([...Object.keys(left), ...Object.keys(right)])
      for (const componentName of Array.from(componentNames).sort()) {
        if (left[componentName] !== right[componentName]) {
          diffs.push(
            `  entity ${key} component ${componentName}:\n` +
              `    ${referenceName}: ${left[componentName] ?? '<absent>'}\n` +
              `    ${name}: ${right[componentName] ?? '<absent>'}`
          )
        }
      }
    }
  }

  if (diffs.length) {
    throw new Error(`Engines diverged (reference: ${referenceName}):\n${diffs.join('\n')}`)
  }
}
