# @dcl/sdk-commands

CLI tools for Decentraland scene development.

## Overview

This package provides command-line tools for creating, developing, and deploying Decentraland scenes. It includes commands for:

- Initializing new scene projects
- Starting a local development server
- Building scenes
- Testing and validating scenes
- Managing scene deployments

## Installation

```bash
npm install @dcl/sdk-commands
```

## Usage

The SDK commands are used via `npx` to run the version installed in your project:

### Create a New Scene

```bash
npx @dcl/sdk-commands init
```

### Start Development Server

```bash
npx @dcl/sdk-commands start
```

### Build Scene

```bash
npx @dcl/sdk-commands build
```

### Deploy Scene

```bash
npx @dcl/sdk-commands deploy
```

Large scenes upload in batches when the target server supports it. While deploying, the linker server exposes the deployment at `/api/deploy`: `GET` returns its state (JSON, or server-sent events with `Accept: text/event-stream`) and `DELETE` cancels it. Cancelling needs the `X-Deploy-Token` header, set with `--deploy-token <token>` (16+ characters) or random per run; the browser gets it in the linker URL fragment (`/#token=...`).

### Export Static Content

```bash
npx @dcl/sdk-commands export-static
```

### Pack Smart Wearable

```bash
npx @dcl/sdk-commands pack-smart-wearable
```

### Manage Quests

```bash
npx @dcl/sdk-commands quests
```

## Development

### Building the Package

```bash
# Build all packages in the monorepo
make build
```

### Testing

```bash
# Run all tests in the monorepo
make test

# Run tests for a specific file
make test FILES="--watch packages/@dcl/sdk-commands/src/path/to/test.spec.ts"
```

### Development Commands

For local development:

```bash
# Clean all build artifacts and reinstall dependencies
make clean && make install

# Format and fix linting issues
make lint-fix

# Update dependencies across packages
make sync-deps
```

## Documentation

For detailed documentation on using the CLI tools, visit:

- [CLI Documentation](https://docs.decentraland.org/creator/development-guide/sdk7/cli/)

### Scene Insights scoped sessions

`scene-insights login` requests a 12-hour scoped login with only `insights:logs-read`,
`insights:metrics-read`, and `insights:executions-read`. Browser and `DCL_PRIVATE_KEY`
sessions use these same explicit grants. They cover scenes the wallet already has
permission to read; the credential is not restricted to a single scene. No wildcard
or write operation is granted. Environments sharing the `insights` service identifier
(including `.org` and `.zone`) accept the same credential.

Previously saved full-login sessions require signing in again. A saved scoped
session expires no later than its parent delegation. Deploy the scoped-login
Insights server before using this command version.
