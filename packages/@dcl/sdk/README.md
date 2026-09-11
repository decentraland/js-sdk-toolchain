# @dcl/sdk

Main SDK package for building Decentraland scenes.

## Overview

The Decentraland SDK provides a complete framework for creating interactive 3D scenes in the Decentraland metaverse. It includes:

- Entity Component System (ECS) for scene development
- UI components and layout tools
- Asset management utilities
- Scene networking capabilities
- Input handling and interactions

## Installation

```bash
npm install @dcl/sdk
```

## Quick Start

1. Create a new scene:

```bash
npx @dcl/sdk-commands init
```

2. Start the development server:

```bash
npm start
```

## Usage

```typescript
import { engine, Entity, Transform, GltfContainer } from '@dcl/sdk/ecs'

// Create an entity
const entity = engine.addEntity()

// Add components
Transform.create(entity, {
  position: { x: 8, y: 0, z: 8 },
  scale: { x: 1, y: 1, z: 1 }
})

GltfContainer.create(entity, {
  src: 'models/myModel.glb'
})
```

## Features

### Removing synchronized entities

On a client using the synchronization transport, `engine.removeEntity(entity)` requests
server approval for a synchronized entity and returns `false` while its ID remains in use.
Its components, local state, and references stay intact until the authoritative server
accepts the deletion. A rejected request leaves the entity unchanged. The SDK retries
unanswered requests every second and stops after ten seconds of engine update time.
Repeated calls while a request is pending share that attempt. Calling `removeEntity`
after a rejection or timeout starts a new attempt.

Scenes can optionally observe the outcome without changing how they remove entities:

```ts
import { engine } from '@dcl/sdk/ecs'
import { onEntityRemovalResult } from '@dcl/sdk/network'

const unsubscribe = onEntityRemovalResult(({ entity, requestId, status }) => {
  console.log('Removal attempt', entity, requestId, status)
})

engine.removeEntity(entity)
// Call unsubscribe() when the listener is no longer needed.
```

The listener receives one result per attempt: `accepted` after local removal,
`rejected` when the server refuses the request, or `timeout` when confirmation does
not arrive in time. A timeout means the outcome is unknown: an authoritative deletion
can still arrive later. Results are emitted only for client requests to remove
synchronized entities. Listener failures are isolated from networking.

Clients and the authoritative server must both use an SDK supporting these request
and result messages. An older server ignores the new request and the client times out.
The transport interface and CRDT operation formats are unchanged.

`removeEntityWithChildren` requests approval for each synchronized entity in the tree;
validators can accept or reject them independently. Unsynchronized entities and entities
removed by the server are removed immediately. Accepted network identities cannot be
recreated by delayed updates; a new incarnation must use a newer entity version or a new
network identity.

The SDK registers its approval callback with `engine.addEntityRemovalHandler()`. Handlers
run synchronously before local state is cleared and must be fast and non-throwing.
A slow or throwing handler can disrupt the engine tick; one that always defers can
prevent local cleanup, including on the server. Use the returned unregister function
when a handler is no longer needed.

The hook coordinates local removal and is not an authorization boundary. The server
still validates peer deletion requests, and the synchronization transport only accepts
network deletions from the authoritative server. Incoming CRDT deletions bypass these
handlers, so a local handler cannot veto an authoritative deletion.

Results are accepted only from the authoritative server and matched to the pending
session, request, and entity identity. Server replay tracking is bounded per peer:
eight sessions, each retaining a window of 128 request IDs. Older requests cannot
run validators again, but can still recover an acceptance for an already deleted
identity. An authoritative deletion also supersedes a cached rejection for that
identity. Leaving the room clears that peer's tracking; deduplication does not
provide permanent exactly-once execution across reconnects.

### Components

- Transform
- GltfContainer
- Material
- UiTransform
- AudioSource
- And many more...

### Systems

- Input handling
- Physics
- Animation
- Networking

### UI Framework

- Flexbox layout
- React-like components
- Event handling

## Development

### Building the Package

```bash
make build
```

### Testing

```bash
# Run all tests
make test
```

### Development Commands

For local development, you can also use:

```bash
# Clean all build artifacts and reinstall dependencies
make clean && make install

# Format and fix linting issues
make lint-fix

# Update dependencies across packages
make sync-deps
```

## Documentation

- [SDK Documentation](https://docs.decentraland.org/creator/development-guide/sdk7/sdk-101/)
- [Scene Examples](https://github.com/decentraland/sdk7-goerli-plaza)
- [ECS](https://docs.decentraland.org/creator/development-guide/sdk7/entities-components/)

## Architecture Decisions

For a deeper understanding of the SDK architecture:

- [ADR-117: CRDT Protocol for Scenes](https://adr.decentraland.org/adr/ADR-117)
- [ADR-123: Schema and Serialization](https://adr.decentraland.org/adr/ADR-123)
- [ADR-165: Component Declaration](https://adr.decentraland.org/adr/ADR-165)
