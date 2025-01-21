# @dcl/ecs

Core Entity Component System (ECS) package for Decentraland scenes. Implements a CRDT-based ECS architecture for networked scene state.

## Installation

```bash
npm install @dcl/ecs
```

## Usage

```typescript
import { engine } from '@dcl/ecs'

// Create entity
const entity = engine.addEntity()

// Define and add component
const Health = engine.defineComponent(1, {
  current: Number,
  max: Number,
  regeneration: Number
})

Health.create(entity, {
  current: 100,
  max: 100,
  regeneration: 1
})

// Create system
engine.addSystem((dt: number) => {
  for (const [entity, health] of engine.mutableGroupOf(Health)) {
    if (health.current < health.max) {
      health.current = Math.min(health.max, health.current + health.regeneration * dt)
    }
  }
})
```

## Technical Overview

### Component Definition

Components are defined with a unique ID and a schema. The schema is used to:

- Generate TypeScript types
- Create binary serializers/deserializers
- Set up CRDT operations

### CRDT Implementation

The ECS uses CRDTs (Conflict-free Replicated Data Types) to enable deterministic state updates across multiple engine instances:

- Component updates are CRDT operations with logical timestamps
- Multiple engine instances can be synced by exchanging CRDT operations
- Conflict resolution uses timestamps and entity IDs to ensure consistency
- Binary transport format minimizes network overhead

### Network Entities

For multiplayer scenes, the `NetworkEntity` component marks entities that should be synchronized across peers:

```typescript
import { engine, NetworkEntity } from '@dcl/ecs'

// Create a networked entity
const foe = engine.addEntity()
NetworkEntity.create(foe)

// Components on this entity will be synced across peers
Health.create(foe, { current: 100, max: 100, regeneration: 1 })
```

Each peer maintains its own engine instance. When using NetworkEntity:

- The owner peer can modify the entity's components
- Other peers receive read-only replicas
- Updates are propagated through the network transport layer using CRDT operations

Example transport message:

```typescript
{
  entityId: number
  componentId: number
  timestamp: number
  data: Uint8Array // Serialized component data
}
```

### Performance Features

- Zero-allocation component iteration
- Dirty state tracking for efficient updates
- Binary serialization for network transport
- Batched component operations

## Development

```bash
# Build
make build

# Test
make test

# Clean and reinstall
make clean && make install
```

## Documentation

- [ECS Guide](https://docs.decentraland.org/creator/development-guide/sdk7/entities-components/)
- [Component Reference](https://docs.decentraland.org/creator/development-guide/sdk7/components/)
- [ADR-117: CRDT Protocol](https://adr.decentraland.org/adr/ADR-117)
