# @dcl/js-runtime

TypeScript definitions for the Decentraland scene runtime environment.

## Overview

This package provides TypeScript type definitions for the Decentraland scene runtime environment. It includes:

- Type definitions for Web APIs (fetch, WebSocket)
- Auto-generated SDK/API type definitions
- Basic runtime types (console, DEBUG flag)

This package does not contain any JavaScript runtime code - it only provides TypeScript types and interfaces used by the SDK and scene developers.

## Installation

```bash
npm install --save-dev @dcl/js-runtime
```

## Development

The types in this package are auto-generated during the monorepo's build process:

```bash
# From the root of the monorepo
make build
```

The generated types will be available in `apis.d.ts`.

## Documentation

- [Scene Development Guide](https://docs.decentraland.org/creator/development-guide/sdk7/scene-content/)
- [Runtime API Reference](https://docs.decentraland.org/creator/development-guide/sdk7/runtime-api/)
