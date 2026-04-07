# CRDT Message Suppression for Unchanged Mutables

## Problem

Calling `getMutable()`, `getMutableOrNull()`, or `getOrCreateMutable()` on a component unconditionally added the entity to the `dirtyIterator` Set. On the next engine tick, every dirty entity got a Lamport timestamp increment, full serialization, and a CRDT message dispatched to all transports -- even when no property was actually changed.

```typescript
// Before: dirtyIterator.add(entity) happened immediately, unconditionally
getMutableOrNull(entity: Entity): T | null {
  const component = data.get(entity)
  if (!component) return null
  dirtyIterator.add(entity)  // <-- always marks dirty
  return component
}
```

This caused unnecessary network traffic, spurious `IsDirty` flags in the Explorer, wasted processing in nearby scenes, and Lamport timestamp inflation.

**GitHub issue:** https://github.com/decentraland/creator-hub/issues/209

## Solution: Snapshot-and-Compare at Flush Time

A `lastSentData: Map<Entity, Uint8Array>` stores the last-sent serialized bytes per entity per component. At flush time, the current component data is serialized and compared against this snapshot. A CRDT message is only emitted (and the Lamport timestamp only incremented) when the bytes actually differ.

```
getMutable(entity) --> dirtyIterator.add(entity)  [unchanged]
                            |
                    [user code runs]
                            |
                  engine.update() tick
                            |
              createGetCrdtMessagesForLww
                            |
                for entity in dirty:
                  serialize(current)
                  compare vs lastSentData
                      |           |
                    SAME       DIFFERENT
                      |           |
                    skip    increment timestamp
                  (no msg)   yield message
                             update snapshot
```

## Changed Files

### `packages/@dcl/ecs/src/engine/lww-element-set-component-definition.ts`

**Core change.** This file contains the LWW component definition, the CRDT message generator, and the CRDT update handler.

#### `createComponentDefinitionFromSchema`

Added `lastSentData: Map<Entity, Uint8Array>()` alongside existing `data`, `dirtyIterator`, and `timestamps` maps. Passed to both `createGetCrdtMessagesForLww` and `createUpdateLwwFromCrdt`.

#### `createGetCrdtMessagesForLww`

Restructured the generator. Previously it allocated a `new ReadWriteByteBuffer()` inside the loop for every dirty entity and incremented the timestamp unconditionally. Now:

- The `ReadWriteByteBuffer` is allocated once outside the loop and reused via `resetBuffer()` per entity, eliminating O(n) buffer allocations per flush.
- For each dirty entity with data:
  1. Serializes the current component data into the reused buffer
  2. Compares via `dataCompare(writeBuffer.toBinary(), previousBytes)` -- `toBinary()` returns a zero-copy subarray view, so the suppressed (no-change) path is allocation-free
  3. If bytes are identical, `continue` (skip -- no message, no timestamp increment)
  4. If bytes differ, calls `toCopiedBinary()` to allocate a stable copy, increments timestamp, stores the copy in `lastSentData`, and yields the message with that same copy as `msg.data`

Delete messages (`!data.has(entity)`) always emit -- they are never suppressed.

#### `createUpdateLwwFromCrdt`

When an incoming CRDT message updates local state (`StateUpdatedTimestamp` or `StateUpdatedData`):

- For `PUT_COMPONENT`: `lastSentData` is set to a defensive copy of the incoming data (`new Uint8Array(msg.data!)`) to prevent corruption if the transport reuses its buffer
- For `DELETE_COMPONENT`: `lastSentData` is deleted

Note: the `StateOutdatedTimestamp` / `StateOutdatedData` paths (where local state wins and a correction message is returned) do not update `lastSentData`. This is safe because the correction message carries the same bytes already reflected by the existing snapshot.

This ensures that after a remote update, a local `getMutable()` without changes correctly detects "no change" relative to the remotely-updated state.

#### `deleteFrom` / `entityDeleted`

Both now call `lastSentData.delete(entity)` to clean up the snapshot when an entity is removed.

#### `createOrReplace`

Calls `lastSentData.delete(entity)` before returning. This ensures `createOrReplace` always emits a CRDT message, because there is no previous snapshot to compare against. This is semantically correct: `createOrReplace` expresses explicit intent to set a value.

This distinction is important:

- `getMutable()` = "I might change something" --> suppressed if nothing changed
- `createOrReplace()` = "I am explicitly setting this value" --> always sends

### `packages/@dcl/sdk/src/network/entities.ts`

**`parentEntity` function fix.** The network parenting system needs to force-send a Transform to the renderer even when the Transform data itself hasn't changed (the renderer transport injects the network parent at the transport layer).

Previously this used `Transform.getMutable(entity)` as a side-effect to trigger a dirty flush. With our optimization, this no longer works since the data is unchanged.

Changed to read the current Transform via `Transform.get(entity)` and then call `Transform.createOrReplace(entity, { ... })` with a field-by-field deep copy of position, rotation, scale, and parent. This:

1. Breaks the `DeepReadonly` wrapper by creating fresh nested objects for each vector/quaternion
2. Calls `createOrReplace`, which clears `lastSentData` (guaranteeing a CRDT message)
3. Preserves the original Transform values

Note: the manual field copy is coupled to the Transform schema. If Transform gains new fields, this code must be updated.

### Test Files

#### `test/ecs/crdt-unchanged-mutable.spec.ts` (new)

15 tests covering:

- `getMutable` / `getMutableOrNull` / `getOrCreateMutable` without changes --> zero messages
- Actual changes (top-level, nested, array) --> messages emitted correctly
- DELETE messages always emitted regardless of prior state
- Lamport timestamp not incremented for suppressed messages
- Snapshot updated after remote CRDT update (`updateFromCrdt`)
- Multiple `getMutable` calls per tick handled correctly
- Value changed back to original within same tick --> correctly suppressed (no net change)
- `createOrReplace` with identical data --> always emits (explicit intent)
- `createOrReplace` with different data --> emits
- Multi-cycle flush correctness

#### `test/ecs/customComponent.spec.ts`

Updated expected Lamport timestamp from 7 to 6 in the "delete entity" conflict resolution test. The lower timestamp reflects one correctly suppressed message: during conflict resolution case 2, engine B's `createOrReplace(45)` was overridden by a remote update to `48` via `updateFromCrdt`, making B's subsequent flush a no-op (serialized bytes match the remote update). Previously this incremented the timestamp despite no actual change.

#### `test/ecs/int8component.ts` / `test/ecs/crdt-rules-lww.spec.ts`

Added `lastSentData` parameter to direct calls to `createGetCrdtMessagesForLww` and `createUpdateLwwFromCrdt` (these test files construct component definitions manually rather than going through the engine).

## Design Decisions

### 1. Eager dirty marking preserved

`getMutable()` still adds to `dirtyIterator`. Suppression happens at flush time in `createGetCrdtMessagesForLww`. This means `dirtyIterator()` still reflects "entities accessed mutably," useful for debugging. The alternative (Proxy-based lazy marking) was rejected for complexity.

### 2. Timestamp increment deferred to after comparison

`incrementTimestamp` is only called after confirming a change. The previous code incremented first, then yielded. This avoids Lamport timestamp gaps that would occur if we incremented and then skipped.

### 3. Binary comparison, not structural

Comparing serialized `Uint8Array` via `dataCompare` is simpler and more reliable than deep object comparison. It handles all schema types (nested objects, arrays, protobuf, OneOf) uniformly because comparison happens at the byte level after serialization.

### 4. `lastSentData` NOT set on `create()`

The initial `create()` does not populate `lastSentData`. This ensures the first flush always emits the create message (no previous snapshot to compare against). The snapshot is populated after the first message is yielded.

### 5. `createOrReplace` always sends

`createOrReplace` clears `lastSentData` so the flush has no snapshot to compare against, guaranteeing a message. This is the escape hatch for code that needs to force a re-send (like network parenting).

### 6. Memory overhead is negligible

`lastSentData` stores one `Uint8Array` per entity per component. For Transform (~44 bytes), 1000 entities with 5 components = ~220KB. For scenes with fewer entities, the cost is proportionally smaller.
