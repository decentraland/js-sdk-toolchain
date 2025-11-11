# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a monorepo for Decentraland's SDK7 toolchain. It contains packages for building interactive 3D scenes and experiences using TypeScript/JavaScript with an Entity Component System (ECS) architecture and CRDT-based networking.

## Common Commands

### Installation and Setup
```bash
# Install dependencies
make install

# Clean and reinstall (when dependencies are corrupted)
make deep-clean && make install && make build
```

### Building
```bash
# Build all packages (includes protobuf compilation)
make build

# Clean build artifacts
make clean

# Complete clean rebuild (removes node_modules)
make deep-clean && make install && make build
```

### Testing
```bash
# Run all tests
make test

# Run a specific test file
make test-file FILE=path/to/test.spec.ts

# Update test snapshots
make update-snapshots

# Clean environment matching CI (WARNING: cleans all local changes)
make deep-clean-and-snapshot
```

### Linting
```bash
# Check for issues
make lint

# Fix linting issues
make lint-fix

# Check package version mismatches
make lint-packages
```

### Development
```bash
# Format code
make format

# Initialize a test scene
make init-test-scene

# Test CLI commands
make test-cli
```

### Protocol Updates
```bash
# Update to latest protocol version
make update-protocol

# Update to protocol-squad branch
make update-protocol-squad

# Update renderer
make update-renderer
```

## Package Structure

- **@dcl/ecs** - Core Entity Component System with CRDT networking
- **@dcl/react-ecs** - React bindings for building UI declaratively
- **@dcl/sdk** - Main SDK package (aggregates other packages)
- **@dcl/sdk-commands** - CLI tools (`sdk-commands` binary)
- **@dcl/js-runtime** - TypeScript definitions for runtime environment
- **@dcl/playground-assets** - Built assets for Decentraland Playground

## Architecture Overview

### Entity Component System (@dcl/ecs)

The ECS implements a CRDT-based networked component system for deterministic state synchronization across peers.

**Key Concepts:**
- **Entity**: A 32-bit number (upper 16 bits = version, lower 16 bits = entity number)
- **Component**: Data containers attached to entities
- **System**: Functions that process entities with specific components each frame
- **CRDT**: Conflict-free Replicated Data Type for networking without centralized coordination

**Component Types:**
1. **Last-Write-Wins (LWW)** - Most common, single authoritative state (Transform, Material, etc.)
2. **Grow-Only Value Set** - Append-only collections for events (PointerEvent, VideoEvent, etc.)

**CRDT Message Types:**
- PUT_COMPONENT (1) - Add/update component
- DELETE_COMPONENT (2) - Remove component
- DELETE_ENTITY (3) - Remove entity
- APPEND_VALUE (4) - Append to grow-only set
- PUT_COMPONENT_NETWORK (5) - Network-specific PUT
- DELETE_COMPONENT_NETWORK (6) - Network-specific DELETE
- DELETE_ENTITY_NETWORK (7) - Network-specific DELETE_ENTITY

**Conflict Resolution:**
- Uses Lamport timestamps for causality
- Higher timestamp wins
- On timestamp tie, binary data comparison determines winner
- Ensures deterministic convergence across all peers

**Key Files:**
- `packages/@dcl/ecs/src/engine/` - Core ECS runtime
- `packages/@dcl/ecs/src/systems/crdt/` - CRDT synchronization
- `packages/@dcl/ecs/src/schemas/` - Type system and serialization
- `packages/@dcl/ecs/src/components/generated/` - Auto-generated from protobuf
- `packages/@dcl/ecs/src/components/manual/` - Hand-written framework components

### React ECS Bindings (@dcl/react-ecs)

Provides React reconciler that maps React components to ECS entities and components.

**How It Works:**
- JSX `<entity>` elements map to ECS entities
- JSX props map to ECS components (uiTransform, uiText, uiBackground, etc.)
- Event handlers map to PointerEventsSystem callbacks
- Parent-child hierarchy managed via Transform parent pointers
- Rendering updates happen every frame via ReactBasedUiSystem

**Key Files:**
- `packages/@dcl/react-ecs/src/reconciler/` - React reconciler implementation
- `packages/@dcl/react-ecs/src/components/` - Pre-built UI components (Button, Input, Label, Dropdown)
- `packages/@dcl/react-ecs/src/system.ts` - System lifecycle

### SDK Commands (@dcl/sdk-commands)

CLI tooling with plugin-style command architecture.

**Available Commands:**
- `init` - Project scaffolding from templates
- `build` - Scene compilation with esbuild (TypeScript → JavaScript)
- `start` - Development server with hot-reload and WebSocket updates
- `deploy` - Deployment to Catalyst servers
- `export-static` - Static content export
- `code-to-composite` - Convert code-only scenes to CRDT/composite format
- `pack-smart-wearable` - Package smart wearables
- `quests` - Quest management

**Build Process:**
1. Generates synthetic entry point with SDK imports
2. Bundles with esbuild (CJS format, ES2020 target)
3. Loads `.composite` files for CRDT/composite scenes
4. Minifies in production mode
5. Generates sourcemaps

**Development Server:**
- HTTP server with CORS
- WebSocket for file watching and hot-reload
- Built-in debug panel
- Realm and communications endpoints
- Avatar/profile resolution
- Web3 support

**Key Files:**
- `packages/@dcl/sdk-commands/src/commands/` - Command implementations
- `packages/@dcl/sdk-commands/src/logic/bundle.ts` - ESBuild configuration
- `packages/@dcl/sdk-commands/src/logic/composite.ts` - Composite file handling
- `packages/@dcl/sdk-commands/src/components/` - Reusable components (fs, logger, analytics, etc.)

## Build System Architecture

The build is orchestrated via Jest test specs in `scripts/`:

**Build Order (scripts/build.spec.ts):**
1. `@dcl/js-runtime` - Compile protobuf APIs, generate type definitions
2. `@dcl/ecs` - Compile ECS components from protobuf, build TypeScript
3. `@dcl/react-ecs` - Install local @dcl/ecs, build TypeScript
4. `@dcl/sdk-commands` - Build CLI tools
5. `@dcl/sdk` - Install all local packages, build aggregated exports
6. `@dcl/playground-assets` - Build playground assets, copy snippets

**Why Jest for builds?**
- Parallelization
- Clear dependency order
- Built-in assertions
- GitHub Actions summary integration

## Protocol Buffer Generation

**Components are auto-generated from @dcl/protocol definitions:**

1. Install protobuf compiler via `make install-protobuf`
2. Run `make compile_apis` to generate RPC API types
3. ECS components generated from `@dcl/protocol/proto/decentraland/sdk/components/`
4. Uses `@dcl/ts-proto` for TypeScript code generation

**Generated Files:**
- `packages/@dcl/ecs/src/components/generated/` - ECS component definitions
- `scripts/rpc-api-generation/src/proto/` - RPC API types
- `packages/@dcl/js-runtime/apis.d.ts` - Runtime type definitions

## Snapshot Testing

Snapshots measure QuickJS opcode execution for test scenes to track runtime performance:

```bash
# Update snapshots after changes
make build update-snapshots

# Clean environment matching CI
make deep-clean-and-snapshot  # WARNING: Cleans git working tree
```

## Testing Patterns

**Unit Tests:**
- Located in `test/` directory
- Use `jest` with `ts-jest` transformer
- Test pattern: `**/*.spec.(ts|tsx)`

**Integration Tests:**
- Build fixtures in `test/build-ecs/fixtures/`
- Scene compilation and runtime tests

**Coverage Requirements:**
- Global: 90% (branches, functions, lines, statements)
- Some paths have reduced thresholds (see jest.config.js)

## Development Workflow

**Working on ECS:**
```bash
cd packages/@dcl/ecs
npm run start  # Watch mode with auto-rebuild
```

**Working on SDK Commands:**
```bash
cd packages/@dcl/sdk-commands
npm run start  # Watch mode
```

**Testing Changes in a Scene:**
```bash
make init-test-scene
cd test-scene
npm install  # Uses local packages
npm run start
```

## Dependency Management

**syncpack** is used to ensure version consistency across packages:

```bash
# Check for version mismatches
make lint-packages

# Auto-fix mismatches
make sync-deps
```

**Local Package Linking:**
- Packages reference each other via `file:../package-name` in package.json
- postinstall hook runs `make sync-deps`

## Version Support

**SDK7 (main branch):**
- Current version
- All new features and improvements

**SDK6 (6.x.x branch):**
- Maintenance mode
- Bug fixes and security patches only
- PRs against `6.x.x` branch
- Releases update `decentraland-ecs` package

## Important Architectural Decisions

**ADRs to understand the system:**
- [ADR-117](https://adr.decentraland.org/adr/ADR-117) - CRDT Protocol for Scenes
- [ADR-123](https://adr.decentraland.org/adr/ADR-123) - Schema and Serialization
- [ADR-124](https://adr.decentraland.org/adr/ADR-124) - Flexbox-based UI
- [ADR-133](https://adr.decentraland.org/adr/ADR-133) - Scene Runtime Definition
- [ADR-165](https://adr.decentraland.org/adr/ADR-165) - Component Declaration
- [ADR-237](https://adr.decentraland.org/adr/ADR-237) - SDK 7 Custom UI Components
- [ADR-281](https://adr.decentraland.org/adr/ADR-281) - Items in Decentraland tooling

Full list: https://adr.decentraland.org/

## Key Design Principles

1. **CRDT-first** - Networking without centralized coordination
2. **Type-safe** - Full TypeScript support with schema-driven types
3. **Deterministic** - All peers reach identical state
4. **Performance-oriented** - Binary serialization, sparse storage, dirty tracking
5. **Composable** - Systems and components are modular
6. **Zero-allocation iteration** - Reuses internal iterators
7. **Immutable-by-default** - `.get()` readonly, `.getMutable()` marks dirty

## Common Gotchas

1. **Build failures after protocol updates**: Run `make clean && make build`
2. **Entity versioning**: Upper 16 bits store version to enable ID reuse
3. **Reserved entities**: First 512 entities (0-511) reserved for renderer
4. **Component dirty tracking**: Using `.getMutable()` marks entity as dirty for CRDT
5. **Inspector as external**: `@dcl/inspector` cannot be imported from scene code
6. **Lamport timestamps**: Used instead of wall-clock for causality
7. **Network entity mapping**: Local entities mapped to network IDs via NetworkEntity component

## Analytics and Telemetry

Analytics tracked via Segment.io (opt-out: `DCL_DISABLE_ANALYTICS=true`):
- Scene creation/initialization
- Build and preview start
- Deployment attempts
- Quest operations
- Anonymized project hash and coordinates

## CI/CD

**GitHub Actions workflows:**
- Build verification
- Test execution with coverage
- Snapshot validation
- API documentation generation (typedoc)
- Release process triggered on GitHub Release creation

## Troubleshooting

**Build issues:**
```bash
make clean && make install && make build
```

**Dependency conflicts:**
```bash
make deep-clean && make install && make build
```

**Protobuf errors:**
```bash
make install-protobuf
make build
```

**Test failures:**
```bash
make test  # Run with verbose output
```

**TypeScript errors:**
- Check package versions match across packages
- Run `make sync-deps`
- Verify `@dcl/protocol` version is consistent
