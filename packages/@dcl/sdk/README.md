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

# Run only ECS tests
make test-ecs
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
