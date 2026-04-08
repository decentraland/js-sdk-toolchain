# AI Agent Context

**Service Purpose:** The Decentraland JavaScript SDK Toolchain is the monorepo that provides all TypeScript/JavaScript packages for building interactive 3D scenes in the Decentraland metaverse. It covers the full developer workflow: an Entity Component System (ECS) runtime with CRDT-based networking, React UI bindings, a CLI for building and deploying scenes, and type definitions for the scene runtime environment.

**Key Capabilities:**

- **ECS Runtime (`@dcl/ecs`)**: Core engine with entity/component/system lifecycle, CRDT-based state synchronization across peers, binary serialization for network transport, and built-in systems for physics, raycasts, tweens, and input.
- **Main SDK (`@dcl/sdk`)**: High-level developer-facing package aggregating all sub-packages. Exposes pre-built components (`Transform`, `GltfContainer`, `Material`, `AudioSource`, `Animator`, `UiTransform`, etc.), math utilities, networking primitives, observables, and testing helpers.
- **React Bindings (`@dcl/react-ecs`)**: Custom React reconciler that bridges React 18 functional components and JSX to the ECS. Implements a CSS Flexbox–subset layout system for UI, theme support, and mouse event handling.
- **CLI (`@dcl/sdk-commands`)**: Node.js binary (`sdk-commands`) for `init`, `start` (dev server with hot reload), `build` (esbuild bundling), `deploy` (signed Catalyst publish), `export-static`, `pack-smart-wearable`, and `quests` commands.
- **Runtime Types (`@dcl/js-runtime`)**: Pure type-definition package (`.d.ts` only, no JS). Declares Web APIs (`fetch`, `WebSocket`, `console`), SDK runtime globals, and auto-generated RPC API types from Decentraland protocol buffers.
- **Playground Assets (`@dcl/playground-assets`)**: Single browser-compatible bundle re-exporting the full SDK for use in the Decentraland web Playground IDE.

**Communication Pattern:** Not a networked service. Packages are npm libraries and CLI tools consumed locally by scene developers. The ECS communicates with the Decentraland Kernel/Renderer at runtime via CRDT binary messages over an abstract transport layer.

**Technology Stack:**

- Language: TypeScript 5.0.2
- Build: TypeScript compiler (tsc) + esbuild (CLI bundling) + Makefile orchestration
- Test: Jest 29.5.0 with ts-jest; snapshot/golden-file tests for QuickJS opcode regression
- Monorepo: npm workspaces under `packages/@dcl/`
- Linting: ESLint with @dcl/eslint-config, Prettier, syncpack (cross-package dep version sync)
- Docs: TypeDoc (API docs), ADR links (architecture decisions)
- React: react@18.2.0 + react-reconciler@0.29.0 (custom fiber)
- Bundler: esbuild (sdk-commands), tsc (library packages)
- Serialization: Custom binary schema system + Protocol Buffers 3.20.1 (RPC definitions)

**External Dependencies:**

- **@dcl/protocol**: Decentraland RPC protocol buffer definitions — auto-compiled to TypeScript during build
- **@dcl/ecs-math**: Vector, quaternion, and matrix math utilities
- **@dcl/crypto**: Cryptographic signing for scene deployments
- **@dcl/inspector**: In-world scene inspector tool (used by `start` command)
- **dcl-catalyst-client**: Publishes scene content to the Catalyst decentralized network
- **@dcl/linker-dapp**: Wallet integration for signing deployment transactions
- **@dcl/quests-client / @dcl/quests-manager**: Quest system integration in the CLI
- **@dcl/gltf-validator-ts**: GLTF model validation during `build` and `deploy`
- **@segment/analytics-node**: CLI usage analytics (opt-out supported)
- **esbuild**: Scene code bundling in `build` and `start` commands
- **chokidar**: File watching for `start` hot reload
- **i18next**: CLI internationalization

**Key Concepts:**

- **Entity Component System (ECS)**: Entities are integer IDs; components are typed data attached to entities; systems are functions that iterate over entities matching a component query. This pattern replaces OOP inheritance with composition.
- **CRDT (Conflict-free Replicated Data Types)**: The protocol for multiplayer scene state synchronization. Independent peers can modify scene state locally and the CRDT layer automatically converges to a consistent state using logical timestamps and entity IDs. Defined in ADR-117.
- **Component Binary Format**: Components are serialized to `Uint8Array` via a schema-driven system (ADR-123). Enables efficient bandwidth usage for real-time updates between scene runtime and renderer.
- **Transport Layer**: Abstract interface (`engine.addTransport()`) for CRDT message delivery. The default renderer transport communicates with the Decentraland Kernel. Custom transports can be added for testing or alternative runtimes.
- **NetworkEntity / SyncComponents**: Components that mark entities for cross-peer synchronization. Only the owner peer may modify; others receive read-only CRDT replicas.
- **Composite / Template**: `main.composite` is a pre-loaded binary file containing pre-instantiated entities and components. Loaded at scene startup to avoid round-trip overhead of building initial state from scratch.
- **React Reconciler**: `@dcl/react-ecs` implements a custom React Fiber that maps React component lifecycle (mount/update/unmount) to ECS entity creation/modification/deletion. JSX becomes ECS calls at reconciliation time.
- **Flexbox Layout**: UI layout in `@dcl/react-ecs` follows a CSS Flexbox subset applied to `UiTransform` components. Computed during the ECS system tick and propagated as component updates.
- **Scene Deployment**: `sdk-commands deploy` bundles the scene, validates content, signs the manifest with a wallet identity via `@dcl/crypto`, and publishes to a Catalyst node. Requires on-chain LAND ownership.
- **Smart Wearables**: Scene-like bundles attached to avatar wearable NFTs. Packaged via `pack-smart-wearable` command.

**SDK Commands — Detailed Reference:**

All commands accept `--dir <path>` to target a project directory other than the current one.

---

**`sdk-commands init`** — Create a new scene project from a template.

| Flag | Description |
| --- | --- |
| `--project <type>` | Template: `scene-template` (default), `px-template`, `smart-wearable`, `library` |
| `--github-repo <url>` | Clone from a specific GitHub repository |
| `--template <url>` | Download a ZIP from a custom URL |
| `--skip-install` | Skip `npm install` after scaffolding |
| `-y, --yes` | Skip the empty-directory confirmation |

Downloads a ZIP from the official GitHub template, extracts it, then runs `npm install`. Produces `scene.json`, `package.json`, `tsconfig.json`, `src/index.ts`, and `bin/index.js`.

**`scene.json` key fields:**
```json
{
  "ecs7": true,
  "runtimeVersion": "7",
  "scene": { "parcels": ["0,0"], "base": "0,0" },
  "main": "bin/index.js",
  "isPortableExperience": false
}
```

---

**`sdk-commands build`** — Compile TypeScript scene code to a JavaScript bundle.

| Flag | Description |
| --- | --- |
| `-w, --watch` | Watch and rebuild incrementally on file changes |
| `-p, --production` | Minify output and emit external sourcemaps instead of inline |
| `--skip-install` | Skip `npm install` before build |

Uses esbuild with `platform: 'browser'`, `format: 'cjs'`, `target: 'es2020'`, and `treeShaking: true`. Bakes `DEBUG=true` (dev) or `DEBUG=false` (production) into the bundle. Runs TypeScript type-checking in a separate process (`tsc --noEmit`). Generates a virtual entry point that imports the scene's `src/index.ts`, SDK composites, and the `main()` startup system. Output path is taken from `scene.json`'s `main` field.

**esbuild module aliases:**
- `react` → scene's `node_modules` → SDK's `react` (forces single instance)
- `@dcl/sdk` → workspace SDK (prevents version mismatches)
- `~system/*` → external (resolved by the Kernel at runtime, never bundled)

---

**`sdk-commands start`** — Run the local development server with hot reload and open the Explorer.

| Flag | Description |
| --- | --- |
| `-p, --port <number>` | HTTP port (auto-detected if omitted) |
| `--dclenv <env>` | Explorer environment: `org` (mainnet production, default), `zone` (staging), `today` |
| `--realm <name>` | Realm name shown in Explorer (default: `Localhost`) |
| `--web3` | Enable Web3 wallet integration in the preview |
| `--skip-build` | Serve pre-built files without rebuilding |
| `--no-watch` | Disable file watching / hot reload |
| `--no-browser` | Don't auto-open Explorer |
| `--ci` | CI mode: disable browser and debug panel |
| `--debug` | Enable scene debug panel (on by default with `--explorer-alpha`) |
| `--explorer-alpha` | Use the new Alpha Explorer deeplink (default) |
| `--web-explorer` | Use legacy web-based Explorer |
| `--mobile` | Print ASCII QR code for mobile preview |
| `--position <x,y>` | Initial spawn position (default: from `scene.json`) |
| `--skip-auth-screen` | Skip Explorer's authentication screen |
| `--hub` | Enable Hub mode |
| `--multi-instance` | Allow multiple Explorer instances |

**Dev server internals:**
- HTTP server on `0.0.0.0:{port}` (fallback port: 2044)
- WebSocket on `/` for scene update messages (protobuf `WsSceneMessage`)
- File watcher: `chokidar` with 800ms debounce, respects `.dclignore`
  - GLTF/GLB changes → `updateModel` message (in-place model swap in Explorer)
  - All other changes → `updateScene` message (full scene reload)
- Optional WebSocket on `/data-layer` for RPC data layer access
- QR deeplink for mobile: `decentraland://open?preview={lan-ip:port}&position={x,y}`

**Explorer deeplink format (desktop):**
```
decentraland://?realm=Localhost&position=0,0&dclenv=org&local-scene=true
```

---

**`sdk-commands deploy`** — Build and publish a scene to the Catalyst network.

| Flag | Description |
| --- | --- |
| `-t, --target <url>` | Target Catalyst server URL |
| `-tc, --target-content <url>` | Target content server (use for Worlds deployments) |
| `--skip-build` | Deploy pre-built files |
| `--skip-validations` | Skip LAND ownership/permission checks |
| `--force-upload` | Re-upload all files even if already present |
| `--yes` | Auto-confirm deletion of existing World scenes |
| `--multi-scene` | Additive deploy — don't delete co-located scenes |
| `--https` | Use HTTPS for the wallet linker |
| `-p, --port <number>` | Port for the linker dapp |
| `-b, --no-browser` | Don't auto-open browser for signing |

**Deployment flow:**
1. Reads and validates `scene.json` (parcel connectivity, file sizes ≤ 50MB, etc.)
2. Builds with `--production` (unless `--skip-build`)
3. Gathers all publishable files respecting `.dclignore`, hashes each with IPFS-style content hashing
4. Creates a signed `EntityType.SCENE` deployment using `DeploymentBuilder`
5. Opens `@dcl/linker-dapp` for wallet signing (or uses `DCL_PRIVATE_KEY` env var for CI)
6. For World scenes: deletes previous deployment before uploading
7. Publishes to Catalyst content server (60-minute timeout)
8. Logs play URL on success

**Deployment environments:**

Always use `--target-content` (not `--target`) to specify where to deploy. There are five deployment targets:

| Environment | `--target-content` URL | Network | Use case |
| --- | --- | --- | --- |
| `.zone` (testnet) | `https://peer.decentraland.zone/content` | Sepolia | Dev/testing — no real funds needed |
| `peer-testing` (staging) | `https://peer-testing.decentraland.org/content` | Mainnet | Final QA, isolated from production |
| `.org` (production) | `https://peer.decentraland.org/content` | Mainnet | Live — what players see |
| Worlds `.zone` | `https://worlds-content-server.decentraland.zone` | Sepolia | World testing on testnet |
| Worlds `.org` | `https://worlds-content-server.decentraland.org` | Mainnet | Live Worlds |

**Deploy command examples:**

```bash
# Testnet parcel (Sepolia — no real MANA/LAND required)
npx sdk-commands deploy --target-content https://peer.decentraland.zone/content

# Staging parcel (Mainnet chain, isolated from production)
npx sdk-commands deploy --target-content https://peer-testing.decentraland.org/content

# Production parcel (live — what players see)
npx sdk-commands deploy --target-content https://peer.decentraland.org/content

# World on testnet
npx sdk-commands deploy --target-content https://worlds-content-server.decentraland.zone

# World on production
npx sdk-commands deploy --target-content https://worlds-content-server.decentraland.org
```

**Catalyst selection priority:** `--target-content` flag → `--target` flag → `DCL_CATALYST` env/`.dclrc` → Sepolia default (`peer.decentraland.zone`) → mainnet default (`peer.decentraland.org`)

---

**`sdk-commands export-static`** — Export scene as static files for self-hosted or Worlds content servers.

| Flag | Description |
| --- | --- |
| `--destination <path>` | Output directory |
| `--realmName <name>` | Generate a realm `about` file (requires `--baseUrl`) |
| `--baseUrl <url>` | Public URL of the exported directory |
| `--commsAdapter <url>` | Comms adapter (default: `offline:offline`) |
| `--timestamp <ts>` | Custom deployment timestamp |

Produces content-addressed files (keyed by hash) plus an entity JSON file per scene. If `--realmName` is given, also writes `{realmName}/about` as a realm descriptor.

---

**`sdk-commands pack-smart-wearable`** — Package a smart wearable project as a ZIP for upload.

Validates the project, builds with `--production`, gathers all publishable files, warns if total size exceeds 2 MB, and writes `smart-wearable.zip`.

---

**`sdk-commands quests`** — Manage Quests on the Decentraland Quests service.

| Flag | Description |
| --- | --- |
| `-m, --manager` | Open the Quests Manager web UI |
| `--create` | Create a quest interactively |
| `--create-from-json <path>` | Create a quest from a JSON file |
| `-l, --list <address>` | List quests by creator address |
| `--activate <questId>` | Activate a deactivated quest |
| `--deactivate <questId>` | Deactivate an active quest |
| `-t, --target <url>` | Target Quests server (default: `https://quests.decentraland.org`) |

---

**`sdk-commands get-context-files`** — Download AI coding-assistant context files from the Decentraland documentation repo into `./dclcontext/`.

---

**Environments:**

The CLI operates against two Decentraland network environments. The environment controls which Catalyst, which blockchain network, and which play domain are used.

| | `.zone` testnet | `peer-testing` staging | `.org` production |
| --- | --- | --- | --- |
| Content server | `peer.decentraland.zone/content` | `peer-testing.decentraland.org/content` | `peer.decentraland.org/content` |
| Blockchain | Ethereum Sepolia | Ethereum Mainnet | Ethereum Mainnet |
| Play domain | `play.decentraland.zone` | isolated (not public) | `play.decentraland.org` |
| MANA / LAND | Test tokens — no real funds | Real funds required | Real funds required |
| `--dclenv` for `start` | `zone` | `org` | `org` (default) |
| Use case | Dev and feature testing | Final QA before prod | Live — what players see |

Worlds have their own content servers: `worlds-content-server.decentraland.zone` (Sepolia) and `worlds-content-server.decentraland.org` (Mainnet).

**Configuration file (`.dclrc`):**

The CLI reads configuration from three locations in increasing priority order:

1. SDK package defaults (`{sdk-commands-package}/.dclrc`)
2. User global (`~/.dclrc`)
3. Project-local (`./.dclrc` in the scene directory)
4. Environment variables (highest priority)

Key `.dclrc` settings:

| Key | Description | Default |
| --- | --- | --- |
| `DCL_DISABLE_ANALYTICS` | Set to `true` to opt out of telemetry | `false` |
| `DCL_CATALYST` | Override the default Catalyst URL | `https://peer.decentraland.org` |
| `DCL_ANON_ID` | Anonymous UUID used for analytics (auto-generated) | — |
| `DCL_PRIVATE_KEY` | Wallet private key for headless/CI deployments (skips linker dapp) | — |

**Scene workspace (`dcl-workspace.json`):**

When a directory contains a `dcl-workspace.json`, commands operate in multi-project workspace mode:

```json
{ "folders": [{ "path": "scene-a" }, { "path": "scene-b" }] }
```

Without this file, the current directory is treated as a single-project workspace. `build` and `start` iterate over all projects in the workspace.

**Out of Scope:**

- The Decentraland Kernel and 3D Renderer (separate repo — the ECS communicates with it but does not implement it)
- Catalyst node infrastructure and asset CDN
- Blockchain contracts, NFT minting, or LAND transactions
- Avatar rendering and customization system
- World Content Servers or comms infrastructure
- The Decentraland Playground web application itself (this repo only provides the `playground-assets` bundle it consumes)

**Project Structure:**

```
js-sdk-toolchain/
├── packages/@dcl/
│   ├── ecs/                     # Core ECS engine + CRDT
│   │   └── src/
│   │       ├── engine/          # Entity/component/system lifecycle
│   │       ├── components/      # Built-in component definitions
│   │       ├── systems/         # CRDT, physics, tween, input, raycast
│   │       └── serialization/   # Binary schema + CRDT ops
│   ├── sdk/                     # Main developer-facing SDK
│   │   └── src/
│   │       ├── index.ts         # Aggregation + re-exports
│   │       ├── network/         # Multiplayer utilities
│   │       ├── players/         # Remote player helpers
│   │       └── testing/         # Scene test utilities
│   ├── react-ecs/               # React bindings
│   │   └── src/
│   │       ├── reconciler/      # Custom React Fiber
│   │       ├── components/      # Label, Button, Input, Dropdown, etc.
│   │       └── system.ts        # ECS system tick for React
│   ├── js-runtime/              # Runtime type definitions only
│   │   ├── index.d.ts
│   │   └── apis.d.ts            # Auto-generated from @dcl/protocol
│   ├── sdk-commands/            # CLI binary
│   │   └── src/
│   │       ├── commands/        # init, start, build, deploy, quests, etc.
│   │       ├── logic/           # Bundling, validation, project file handling
│   │       ├── components/      # Analytics, logging, workspace introspection
│   │       └── locales/         # i18n translation files
│   └── playground-assets/       # Browser-compatible SDK bundle
│       └── src/index.ts         # Re-exports @dcl/sdk for browser
├── test/                        # Integration and snapshot tests
│   ├── ecs/                     # ECS unit tests
│   ├── react-ecs/               # React reconciler tests
│   ├── sdk-commands/            # CLI command tests
│   ├── build-ecs/               # Build integration fixtures
│   └── snapshots/               # QuickJS golden files
├── docs/                        # Architecture notes and ADR summaries
├── scripts/                     # Build scripts, code generation, RPC proto compilation
├── Makefile                     # Build orchestration (install / build / test / lint)
└── package.json                 # npm workspaces root
```

**Configuration:**

The monorepo is built and tested via `make`:

| Command | Purpose |
| --- | --- |
| `make install` | `npm install` + install protobuf binary |
| `make build` | Full build: tsc all packages, generate types from protocol buffers, run build spec |
| `make test` | Jest test suite including snapshot/golden tests |
| `make lint-fix` | ESLint + Prettier auto-fix |
| `make sync-deps` | Synchronize dependency versions across packages with syncpack |
| `make update-snapshots` | Regenerate QuickJS opcode golden files |

Internal workspace packages reference each other via `file:../` paths during development, replaced with pinned semver ranges on publish.

**Testing:**

- **Unit tests**: Jest with ts-jest; coverage thresholds at 100% for `@dcl/ecs` branches/functions/lines
- **Snapshot tests** (`test/snapshots.spec.ts`): Compile scene fixtures to QuickJS opcodes and compare against golden files to detect unintended runtime regressions
- **Build integration tests** (`test/build-ecs/`): Run full `sdk-commands build` against scene fixtures (simple-scene, ecs7-scene, smart-wearable, etc.) and assert output artifacts
- **CI**: GitHub Actions — lint → docs → test (jest + codecov) → publish (npm to S3 + GitHub release)
