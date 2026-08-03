# Documentation Index

Curated map of every doc in this repo. Use this as the entry point when looking for a topic.

## Project overview

| Doc | What it covers |
| --- | --- |
| [ai-agent-context.md](ai-agent-context.md) | **Canonical project briefing** — every package's purpose, key concepts (ECS, CRDT, composites, React reconciler, transports), tech stack, full CLI command reference, deployment environments (`.zone` / `peer-testing` / `.org`), project layout, and what's out of scope. Start here. |
| [../README.md](../README.md) | Public-facing repo overview, package list, quick-start (clone → `make install` → `make build`). |
| [../AGENTS.md](../AGENTS.md) | Agent-facing instructions: dev commands, conventions, spec workflow, shell safety. |

## Architecture & runtime internals

| Doc | What it covers |
| --- | --- |
| [components-definition.md](components-definition.md) | How components are defined and registered with the engine — the foundation for the ECS data model. |
| [components-serialization.md](components-serialization.md) | Component binary serialization format. Schema-driven; targets bandwidth efficiency for real-time peer sync (ADR-123). |
| [bytebuffer-interface.md](bytebuffer-interface.md) | Low-level binary buffer interface used by the serialization layer. |
| [wire-message.md](wire-message.md) | CRDT wire message format on the transport layer between ECS and Kernel/peers. |
| [crdt-unchanged-mutable-suppression.md](crdt-unchanged-mutable-suppression.md) | Optimization: how `getMutable` reads that don't actually mutate are suppressed from CRDT delta output. |
| [world-transform-no-caching.md](world-transform-no-caching.md) | Why world-space transforms are computed lazily (not cached) and what that means for system authors. |
| [on-demand-composite-loading.md](on-demand-composite-loading.md) | Runtime composite instantiation via `engine.addEntityFromComposite(src, options)`. The provider abstraction and pre-registration flow. |
| [material-getflat-api.md](material-getflat-api.md) | Material `getFlat` API: reading a fully-resolved material descriptor instead of the discriminated union. |

## Guides (how-to)

| Doc | What it covers |
| --- | --- |
| [adding-or-modifying-a-component.md](adding-or-modifying-a-component.md) | Step-by-step recipe for introducing a new built-in component or evolving an existing one — schema definition, serialization, default values, tests. |

## Specs

`docs/specs/<feature>/` holds multi-phase implementation specs produced via the `/plan-plus:plan` plugin. Each spec contains a `plan.md`, per-phase files (`phase-N-<slug>.md`), a `learnings/` sidecar, and (post-execution) `review.md` + `security-review.md`.

Specs are working artifacts: whether they ship as part of PR diffs is a per-PR judgment call. Add `docs/specs/` to `.gitignore` if your team prefers them as local-only audit trails.

## External — Architecture Decision Records (ADRs)

ADRs do NOT live in this repo. They are maintained in the [`@dcl/protocol`](https://github.com/decentraland/protocol) repo and referenced throughout the code by number. The ones most relevant to this SDK toolchain:

- **ADR-117** — CRDT protocol specification.
- **ADR-123** — Component binary serialization format.

When the codebase mentions an ADR by number, follow up there for the authoritative design.

## Per-package READMEs

Each package has its own README with publication-facing usage notes:

- [packages/@dcl/sdk/README.md](../packages/@dcl/sdk/README.md)
- [packages/@dcl/ecs/README.md](../packages/@dcl/ecs/README.md)
- [packages/@dcl/react-ecs/README.md](../packages/@dcl/react-ecs/README.md)
- [packages/@dcl/sdk-commands/README.md](../packages/@dcl/sdk-commands/README.md)
- [packages/@dcl/js-runtime/README.md](../packages/@dcl/js-runtime/README.md)
- [packages/@dcl/playground-assets/README.md](../packages/@dcl/playground-assets/README.md)

## Adding a new doc

- Per-topic deep dive (architecture, internals, performance note) → `docs/<topic>.md`, then add a row to the relevant table above.
- Feature design / refactor plan → `docs/specs/<feature>/` via `/plan-plus:plan`.
- Public-facing usage note → the relevant package's `README.md`.
- Agent-facing convention or development command → update `AGENTS.md` (not a separate file).
