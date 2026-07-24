# Agent Instructions

This is the **Decentraland JavaScript SDK Toolchain** monorepo — TypeScript/JavaScript packages for building interactive 3D scenes for Decentraland.

## Start here

Before doing non-trivial work, read:

1. **[docs/ai-agent-context.md](docs/ai-agent-context.md)** — comprehensive project overview: every package's purpose, key concepts (ECS, CRDT, composites, React reconciler, transports), tech stack, full CLI command reference, deployment environments, and project layout. This is the canonical project briefing.
2. **[docs/REFERENCES.md](docs/REFERENCES.md)** — curated index of every doc in this repo, grouped by topic.
3. **[README.md](README.md)** — public-facing repo overview and quick-start.

For deeper context on a specific subsystem (component serialization, CRDT suppression, world transform behavior, etc.), use `docs/REFERENCES.md` as the entry point.

## Packages

Six packages under `packages/@dcl/` (a monorepo layout, but **not** npm workspaces):

| Package | Purpose |
| --- | --- |
| `@dcl/ecs` | Core ECS engine + CRDT networking |
| `@dcl/sdk` | Main developer-facing aggregator package |
| `@dcl/react-ecs` | React bindings (custom Fiber + Flexbox layout) |
| `@dcl/sdk-commands` | CLI binary (`init`, `start`, `build`, `deploy`, …) |
| `@dcl/js-runtime` | Type-definition-only package for scene runtime globals |
| `@dcl/playground-assets` | Browser-compatible SDK bundle |

Internal references use `file:../` paths during development; published versions get pinned semver ranges (managed via syncpack — see `make sync-deps`).

The root `package.json` has no `workspaces` field — root `make install` only installs root-level tooling deps. Each package keeps its own standalone `package-lock.json`, and per-package `node_modules/` are populated by `make build`, which runs `npm i` inside each package (`scripts/build.spec.ts`). Don't expect package deps to be hoisted to the root `node_modules/`.

## Development commands

The repo is orchestrated via **`make`** (the Makefile is the source of truth — `package.json` only carries `postinstall`). All commands run from the repo root:

| Task | Command | Notes |
| --- | --- | --- |
| Install deps | `make install` | `npm install` + downloads the protobuf compiler binary |
| Full build | `make build` | Compiles all packages with `tsc` + generates protobuf-derived TS |
| Run all tests | `make test` | Jest across all packages (includes snapshot/golden-file tests) |
| Lint (check) | `make lint` | Runs `scripts/lint-packages.ts` — ESLint + Prettier check per package |
| Lint (auto-fix) | `make lint-fix` | Runs `make sync-deps` then lint with `--fix` |
| Format | `make format` | `prettier --write "**/*.{js,ts,tsx,json}"` |
| Sync dep versions | `make sync-deps` | Cross-package version alignment via syncpack |
| Update snapshots | `make update-snapshots` | Regenerate QuickJS opcode golden files after intentional runtime changes |

### Scoped testing

The full Jest suite is slow. For faster iteration, scope to a path pattern:

```bash
node_modules/.bin/jest --colors --forceExit --testPathPattern='test/sdk-commands'
node_modules/.bin/jest --colors --forceExit --testPathPattern='test/ecs'
node_modules/.bin/jest --colors --forceExit --testPathPattern='test/react-ecs'
node_modules/.bin/jest --colors --forceExit --testPathPattern='test/snapshots'
```

### Per-package typecheck

A fast feedback loop without running the full test suite:

```bash
cd packages/@dcl/<package> && npx tsc --noEmit -p tsconfig.json
```

### Snapshot maintenance

After running `make update-snapshots` (or `UPDATE_SNAPSHOTS=true` with a scoped Jest run), you **MUST** verify that no regenerated `.crdt` file contains an `ERR!` line:

```bash
grep -rn "ERR!" test/snapshots/        # must return no output
```

An `ERR!` line means the QuickJS eval threw mid-execution (commonly a missing mock in `test/snapshots.spec.ts`'s `require` shim — e.g. a new `~system/Runtime` method the SDK started calling at module-load). The resulting snapshot captures a *truncated* run, hides real behavior, and would mask future regressions.

**Anti-pattern:** committing snapshots containing `ERR! Error: Unknown module ...`, `ERR! TypeError: ... is not a function`, or any other `ERR!` trace. Treat them as broken artifacts — fix the mock (or the underlying scene-load failure), regenerate, and re-verify before committing.

### Bumping `@dcl/inspector` (the vehicle for `@dcl/asset-packs`)

`@dcl/asset-packs` is not a direct dependency of this repo — it ships nested inside `@dcl/inspector`, and `packages/@dcl/sdk-commands/src/logic/bundle.ts` resolves it from the inspector's `node_modules`. To bump (prior art: commits `04270ca5`, `8b6bd63d`):

1. `cd packages/@dcl/sdk-commands && npm i --save-exact @dcl/inspector@<x.y.z>` — updates the pin, the package's standalone lockfile, and its `node_modules/` in one step (same pattern as the Makefile's `update-protocol` target).
2. `make build` from the repo root.
3. Regenerate snapshots with a `UPDATE_SNAPSHOTS=true` scoped Jest run — `test/snapshots/package-lock.json` updates itself during this run. Verify no `ERR!` lines (see above).

Asset-packs injection is gated behind `isEditorScene` (requires `assets/scene/main.composite` — see `packages/@dcl/sdk-commands/src/logic/project-validations.ts`), so inspector bumps no longer change `.crdt` snapshots. An empty snapshot diff is expected, not a stale artifact.

## Committing hygiene gotchas

- A newer local npm rewrites committed lockfiles with `"peer": true` / `"dev": true` metadata churn during installs (root and per-package lockfiles). Revert lockfile changes unrelated to your dependency change before committing.
- `make format` runs prettier over the whole repo, including paths CI's `make lint` does not check (`test/`, `scripts/`, dot-files), where HEAD may carry drift — a blind `make format` can dirty dozens of unrelated files. Check your own files, revert the rest.

## Code conventions

- **TypeScript** 5.0.2, strict mode.
- **Conventional Commits** for commit subjects (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`, `perf:`). Match the existing `git log` style.
- **No `Co-Authored-By`** lines in commits (carried over from the user's global preference).
- **Prettier** governs all `*.{js,ts,tsx,json}` formatting. Run `make format` before committing.
- **ESLint** governs lint rules; `make lint` must exit 0.
- **100% coverage** required for `@dcl/ecs` (branches / functions / lines).
- Prefer **`make` targets** over running tools directly — they pick up monorepo-wide config (workspace globs, syncpack rules, etc.).
- **Adding or modifying a built-in component**: follow [docs/adding-or-modifying-a-component.md](docs/adding-or-modifying-a-component.md).

## Spec & planning conventions

This repo uses the **`/plan-plus:*` plugin** for multi-phase feature work. New designs land under `docs/specs/<feature>/` with `plan.md`, per-phase files, and a `learnings/` sidecar. Whether these directories ship as part of PR diffs is a per-PR judgment call — add `docs/specs/` to `.gitignore` if your team prefers keeping them as local-only audit trails.

## Shell safety

Some shell environments alias destructive commands to interactive mode (`cp -i`, `mv -i`, `rm -i`), which causes long-running agent sessions to hang on confirmation prompts. Prefer explicit non-interactive flags:

```bash
cp -f source dest          # not: cp source dest
mv -f source dest          # not: mv source dest
rm -f file                 # not: rm file
rm -rf directory           # not: rm -r directory
```

For other potentially-prompting tools: `ssh`/`scp -o BatchMode=yes`, `apt-get -y`, `brew` with `HOMEBREW_NO_AUTO_UPDATE=1`.

## What's out of scope for this repo

The following live in separate repos and should not be implemented here:

- The Decentraland Kernel and 3D Renderer (the ECS talks to it via CRDT messages but doesn't implement it).
- Catalyst node infrastructure and asset CDN.
- Blockchain contracts, NFT minting, LAND transactions.
- Avatar rendering and customization.
- World Content Servers and comms infrastructure.
- The Decentraland Playground web application itself (this repo only provides the `@dcl/playground-assets` bundle it consumes).

ADRs (Architecture Decision Records) referenced in code by number (e.g., ADR-117 for CRDT) live in the [`@dcl/protocol`](https://github.com/decentraland/protocol) repo.
