# `main-entities.ts` — declarative scene authoring for SDK7

**Status**: experimental, opt-in. Lives alongside the existing `main.composite` + `main.crdt` pipeline. Compiled into `main.crdt` at build time by `getAllComposites` (`packages/@dcl/sdk-commands/src/logic/composite.ts`).

## Why it exists

SDK7 has two existing authoring paths:

1. **Code-first** (the official template). Entities are imperatively created in `src/index.ts` via `engine.addEntity()` + component `.create()` calls.
2. **`main.composite`** — Creator Hub's JSON output. A complete entity-component-system snapshot including Inspector metadata, smart items, asset packs, layout state, and ~50 component types.

Neither fits the use case `main-entities.ts` was built for:

- **An AI agent (LLM) authoring a scene from a natural-language prompt.** Code-first means the model has to construct correct ECS plumbing for every entity — easy to get wrong, hard to round-trip with a visual editor. `main.composite` is JSON the model can in principle emit, but its surface includes Inspector node trees, smart-item Actions/Triggers/States, and asset-pack remappings the model neither knows nor needs.
- **A live in-scene visual editor.** Dragging a gizmo on a cube must persist back to a file the model can read and modify next turn. JSON with numeric entity keys and Inspector wrappers is not that file. A typed TypeScript literal is.

`main-entities.ts` is the narrowest possible declarative format for the *static, visible* parts of a scene: a typed `scene` object literal where each key is an entity name and each value is a small set of supported components. Compiled into `main.crdt` at build time. Idempotent, diffable, AI-friendly, gizmo-friendly.

```ts
// main-entities.ts
import type { Scene } from '@dcl/sdk/scene-types'

export const scene = {
  blue_cube: {
    components: {
      Transform: { position: { x: 8, y: 1, z: 8 } },
      MeshRenderer: { mesh: { $case: 'box', box: { uvs: [] } } },
      Material: { material: { $case: 'pbr', pbr: { albedoColor: { r: 0, g: 0, b: 1, a: 1 } } } }
    }
  }
} satisfies Scene
```

```ts
// src/index.ts — behavior, attached to entities by name
import { engine, pointerEventsSystem, InputAction } from '@dcl/sdk/ecs'

export function main() {
  const cube = engine.getEntityOrNullByName('blue_cube')
  if (cube) pointerEventsSystem.onPointerDown(
    { entity: cube, opts: { button: InputAction.IA_POINTER, hoverText: 'Click me' } },
    () => console.log('clicked')
  )
}
```

## Scope

`main-entities.ts` is **not** a replacement for `main.composite`. It is a narrow alternative for scenes whose static content fits the supported component subset. Both formats can coexist in a single scene — `getAllComposites` layers composite-loaded entities first, then applies `main-entities.ts` on top of the same engine.

### Currently supported components

`Name`, `Transform`, `GltfContainer`, `MeshRenderer`, `MeshCollider`, `Material`, `VisibilityComponent`, `Billboard`, `AudioSource`, `AudioStream`, `VideoPlayer`, `TextShape`, `NftShape`, `Animator`, `LightSource`, `AvatarShape`, `AvatarAttach`, `CameraModeArea`, `VirtualCamera`, `GltfNodeModifiers`, `Tween`, `TweenSequence`, `PointerEvents`.

Note: `PointerEvents` declares the *click configuration* (event types, hover text, button bindings). The handler callback itself is registered separately at runtime via `pointerEventsSystem.onPointerDown(...)`. Same split for `Tween`: the initial tween (start/end, easing, duration) declares scene-load motion; mutating or replacing the tween at runtime happens in code.

### Out of scope

**Components on reserved engine entities.** `MainCamera`, `AvatarBase`, `AvatarEquippedData` live on `engine.CameraEntity` and `engine.PlayerEntity`. Those entities are engine-managed and have no user-assignable names, so `main-entities.ts` (which is name-keyed) has no slot to express them.

**Components added by helper APIs.** `NetworkEntity` is added implicitly by `syncEntity()`, which takes an integer sync ID. The canonical entry point is the helper, not the component.

**Runtime-only patterns.**

- React-ECS UI nodes — not ECS entities.
- `AvatarModifierArea` — could in principle be declared static if a use case emerges; left out pending demand.
- Custom user-defined components (`engine.defineComponent`) — TypeScript can't statically know the user's schema.
- Procedurally generated entities (loops, noise-driven placement).
- Conditional / runtime-lifecycle entities (NFT-gated, time-based, server-message-spawned).

These remain `engine.addEntity()` + `.create()` in `src/index.ts` and reference `main-entities.ts` entities by name when needed (parent relationships, look-at targets, click handlers).

## Format constraints

The `scene` constant is parsed at build time via the TypeScript AST walker in `packages/@dcl/sdk-commands/src/logic/main-entities.ts`. The walker accepts only JSON-compatible literal grammar:

- primitives: number, string, boolean, null;
- array literals (no spread, no holes);
- object literals (`key: value` only, no computed keys, no shorthand, no spread);
- discriminated unions encoded as `{ $case: 'tag', tag: { ... } }` (used by `MeshRenderer.mesh`, `Material.material`, `LightSource.type`, etc.);
- enum values written as their numeric value (e.g., `style: 0` for `NftFrameType.NFT_CLASSIC`, `mode: 1` for `CameraType.CT_THIRD_PERSON`).

What is *not* allowed: imports referenced inside the literal, function calls (`Vector3.create(...)`, `Color4.White()`, `LightSource.Type.Point({})`), identifier values (`NftFrameType.NFT_CLASSIC`), computed expressions, template strings with substitutions. These are author-time conveniences that don't survive serialization.

## Entity-name resolution

Two fields are resolved from entity-name strings to numeric Entity IDs at build time:

- `Transform.parent` (pass 2 in `applySceneToEngine`)
- `VirtualCamera.lookAtEntity`

All other entity-reference fields (e.g., `Material.texture.videoTexture.videoPlayerEntityId`, `MainCamera.virtualCameraEntity`) require numeric IDs and are therefore set at runtime in `src/index.ts`, looking up the target via `engine.getEntityOrNullByName`.

## In-place editor updates

The `/editor/changes` POST handler in `packages/@dcl/sdk-commands/src/commands/start/server/routes.ts` accepts a name-keyed map of component updates and splices them back into the existing `main-entities.ts` source using the same AST walker. Imports, comments, and the `satisfies Scene` / `: Scene` annotation are preserved by surrounding-text splice. After write, `applySceneToEngine` + `dumpEngineToCrdtCommands` regenerate `main.crdt` synchronously so the next scene reload reflects the edit.

This loop is what powers the in-scene gizmo editor in **OpenDCL Studio** ([dcl-regenesislabs/opendcl-studio](https://github.com/dcl-regenesislabs/opendcl-studio)) — drag-end persists into `main-entities.ts`, the file remains diffable and human-readable, the AI can re-read it on the next turn.

## Path to convention

The current implementation is opt-in: scenes without `main-entities.ts` are unaffected. To promote it to an SDK convention we'd want:

1. **Coverage expansion.** Add components as need arises (this PR added 5; remaining gaps are documented above). Each addition is a small, isolated change in `scene-types.ts` + `applySceneToEngine`.
2. **Editor-side codegen** for the `Scene` type so `import type { Scene } from '@dcl/sdk/scene-types'` is the single source of truth (done — `ValueOf<typeof Component>` derives shapes from existing component definitions; no parallel schema).
3. **Inspector compatibility**. Creator Hub should be able to read entities authored in `main-entities.ts` and surface them in the entity tree, even if Inspector continues writing to `main.composite`. Today both formats compile into the same `main.crdt` so runtime behavior is unified; tooling co-existence is the next step.
4. **Template update.** The official scene template (`decentraland/sdk7-scene-template`) ships with the code-first pattern. A future revision can include a `main-entities.ts` with one example entity to advertise the pattern.

## References

- Implementation: `packages/@dcl/sdk-commands/src/logic/main-entities.ts`
- Type surface: `packages/@dcl/sdk/src/scene-types.ts`
- Build integration: `packages/@dcl/sdk-commands/src/logic/composite.ts`
- Editor POST handler: `packages/@dcl/sdk-commands/src/commands/start/server/routes.ts`
- File watcher: `packages/@dcl/sdk-commands/src/commands/start/server/file-watch-notifier.ts`
