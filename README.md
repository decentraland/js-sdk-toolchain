# Decentraland SDK Toolchain

This monorepo contains the core packages for Decentraland's SDK and development tools.

## Packages

- **[@dcl/sdk](packages/@dcl/sdk/README.md)**: Main SDK package for building Decentraland scenes using TypeScript/JavaScript
- **[@dcl/ecs](packages/@dcl/ecs/README.md)**: Core Entity Component System (ECS) implementation with CRDT-based networking support
- **[@dcl/react-ecs](packages/@dcl/react-ecs/README.md)**: React bindings for the ECS, providing a declarative way to build UIs using React's component model and JSX syntax
- **[@dcl/js-runtime](packages/@dcl/js-runtime/README.md)**: TypeScript definitions for the Decentraland scene runtime environment.
- **[@dcl/inspector](packages/@dcl/inspector/README.md)**: Visual editor and development tool for building Decentraland scenes
- **[@dcl/sdk-commands](packages/@dcl/sdk-commands/README.md)**: CLI tools and commands for scene development, testing, and deployment
- **[@dcl/playground-assets](packages/@dcl/playground-assets/README.md)**: Contains the built assets required by the Decentraland Playground

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/decentraland/js-sdk-toolchain.git
cd js-sdk-toolchain
```

2. Install dependencies and build all packages:

```bash
make install
make build
```

## Development

### Building

The project uses a Makefile to handle all build tasks:

```bash
# Build everything (including protobuf)
make build

# Clean build artifacts
make clean

# Clean everything (including node_modules) and rebuild
make deep-clean && make install && make build
```

### Testing

```bash
# Run all tests
make test

# Run ECS tests
make test-ecs

# Run Inspector tests
make test-inspector

# Run tests with coverage
make test-coverage

# Update test snapshots
make update-snapshots
```

### Protobuf

The project uses Protocol Buffers for type-safe communication. Protobuf files are automatically compiled during the build process.

To manually rebuild protobuf files:

```bash
make proto
```

## Release Process

1. Merge changes to the main branch
2. Wait for CI workflow completion in GitHub Actions
3. Create a new Release following the [version guidelines](https://docs.decentraland.org/creator/releases/version-agreement/)

## Testing Infrastructure

### Snapshot Testing

We use snapshot testing with golden files to track runtime performance impacts:

- Snapshots measure QuickJS opcode execution for test scenes
- Run `make build update-snapshots` to update golden files
- For clean environment matching CI, use `make deep-clean-and-snapshot`
  > Note: This cleans all local changes in your git working tree

### Running Tests

```bash
# All tests
make test

# Specific package
make test-ecs
make test-inspector
```

## SDK Version Support

### SDK7

The main branch contains SDK7, the current version. All new features and improvements target SDK7.

### SDK6 Maintenance

SDK6 is maintained in the `6.x.x` branch for critical fixes:

- No new features are added
- Only bug fixes and security patches
- Create PRs against the `6.x.x` branch
- Releases update the `decentraland-ecs` package

## Troubleshooting

If you encounter build issues:

1. Clean the project and reinstall dependencies:

```bash
make clean && make install
```

2. Rebuild everything and run tests:

```bash
make build && make test
```

Common issues:

- **Build failures**: Try `make clean && make install && make build`
- **Test failures**: Run `make test` to see detailed errors
- **Protobuf errors**: Run `make proto` to rebuild protocol buffers
- **Package conflicts**: Delete `node_modules` and run `make install` again
- **TypeScript errors**: Check package versions match in `package.json` files

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Architecture Decisions

For a deeper understanding of the architecture and design decisions:

- [ADR-117: CRDT Protocol for Scenes](https://adr.decentraland.org/adr/ADR-117) - Details the scene state synchronization
- [ADR-123: Schema and Serialization](https://adr.decentraland.org/adr/ADR-123) - Explains component data handling
- [ADR-124: Implementing Flexbox-based UI](https://adr.decentraland.org/adr/ADR-124) - Describes the UI layout system
- [ADR-125: User Interface Components](https://adr.decentraland.org/adr/ADR-125) - Covers the UI system architecture
- [ADR-133: Scene Runtime Definition](https://adr.decentraland.org/adr/ADR-133) - Details how scenes are executed
- [ADR-153: Transform SDK Component](https://adr.decentraland.org/adr/ADR-153) - Explains the core Transform component
- [ADR-165: Component Declaration](https://adr.decentraland.org/adr/ADR-165) - Describes the ECS component system design
- [ADR-237: SDK 7 Custom UI Components](https://adr.decentraland.org/adr/ADR-237) - Details the UI component system
- [ADR-281: Items in Decentraland tooling](https://adr.decentraland.org/adr/ADR-281) - Explains the Items abstraction used across tools
- [ADR-282: Decentraland Inspector](https://adr.decentraland.org/adr/ADR-282) - Details the Inspector's architecture and integration approaches

For more ADRs, visit our [ADR repository](https://adr.decentraland.org/).

## License

Apache 2.0
