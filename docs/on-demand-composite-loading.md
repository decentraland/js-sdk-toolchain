# On-demand composite loading

Composites other than `main.composite` are no longer inlined into the scene JS bundle at build time. They lazy-load at runtime via `compositeProvider.loadComposite(src)` (backed by `~system/Runtime.readFile`), and the asset-packs `SPAWN_ENTITY` handler preloads on cache miss before calling the still-synchronous `engine.addEntityFromComposite`. `Composite.instance()` now actually returns the root entity instead of dropping it.

## Reusable patterns

- **Preload-then-spawn for non-bundled composites.** When you need to instantiate a composite by `src` and aren't sure it was bundled, ask the provider first, and only call the sync engine API after the cache is warm.
  - Handler shape: `creator-hub/packages/asset-packs/src/actions.ts` — `handleSpawnEntity`. Cache hit (or no `loadComposite` available) takes the sync path; cache miss does `provider.loadComposite(src).then(spawn).catch(log)`.
  - Provider entry point: `packages/@dcl/sdk/src/composite-provider.ts` — `loadComposite(src)` reads the file via `~system/Runtime.readFile`, decodes, dedups against the in-memory `composites` array, and returns the existing entry on a second call for the same `src`.
- **Two build-time globs, two virtual modules.** `getAllComposites` (`packages/@dcl/sdk-commands/src/logic/composite.ts`) scans two patterns and routes them to different downstream consumers:
  - `**/*.composite` → instantiated into a throwaway build-time engine. `main.composite` — and only `main.composite` — is then inlined into the `~sdk/all-composites` virtual module so first-frame boot is synchronous. Secondary `.composite` files stay on disk and lazy-load at runtime via the provider.
  - `**/composite.json` (asset-packs convention) → NOT instantiated at build time. Scanned only to collect custom (non-`core::`) component schemas for the `~sdk/composite-components` virtual module, which pre-registers them pre-seal so runtime `addEntityFromComposite` doesn't trip the engine's seal check.
  - Both contribute to the `watchFiles` array consumed by the esbuild plugin in `bundle.ts`; edits to either kind invalidate the JS bundle.
- **Public `Composite.instance()` returns the root entity.** Wrapper in `packages/@dcl/ecs/src/composite/index.ts` forwards `instanceComposite(...)`'s return. Return type widened from `void` to `Entity` (non-breaking). `Entity` is a branded number, so assertions like `expect(rootEntity).toBeGreaterThan(0)` need `as number` under ts-jest strict mode.

## Gotchas and constraints

- **Lazy sub-composite recursion is NOT supported in v1.** A composite whose root references another composite goes through `CompositeRootComponent` recursion inside `instanceComposite` (in `packages/@dcl/ecs/src/composite/instance.ts`, the `## 2 ##` block), which calls the sync `getCompositeOrNull`. If the referenced child isn't bundled (i.e. isn't `main.composite`), instancing fails. Accepted limitation for the `SPAWN_ENTITY` single-composite item case. Making `instanceComposite` async would require Foundation review and would force the headless `code-to-composite` tool async too — out of scope.
- **`engine.addEntityFromComposite` stays synchronous on purpose.** It's Foundation-reviewed renderer-facing surface. Any new caller that needs lazy loading must do the preload in user-land (mirror the asset-packs handler shape). Don't be tempted to make it async.
- **`~system/Runtime` is not resolvable in unit tests.** Anything that pulls `@dcl/sdk/composite-provider` into its module graph at test time will fail with `Error: Unknown module ~system/Runtime`. To avoid the mock, write tests against `packages/@dcl/ecs/src` directly (as `test/ecs/composite.spec.ts` and `test/ecs/add-entity-from-composite.spec.ts` do — neither imports `@dcl/sdk`). If you must cross into `@dcl/sdk`, mock `~system/Runtime.readFile`. Snapshot bundles in `test/snapshots/**/*.crdt` are sensitive to this and to entity numbering / composite-bundling order — expect them to flip when the `main.composite` boot path changes.
- **Two unrelated `watchFiles` arrays in sdk-commands.** One in `logic/composite.ts` drives composite bundling; another in `bundle.ts` (inside `collectScriptData` / `generateInitializeScriptsModule`) lists script `.ts` paths. Don't conflate them when grepping.
- **First-call cache-miss defers by one microtask.** Cache-hit calls to `engine.addEntityFromComposite` resolve in the same tick as the call. The cache-miss preload-then-spawn pattern (see above) routes through `readFile`'s microtask, so any downstream event that the *caller* fires after `addEntityFromComposite` returns lands one tick after the originating action. Consumers that previously assumed strict same-tick semantics need to tolerate the deferral on the first call per `src` (asset-packs' `ON_SPAWN` event is one example of a consumer that observes this).
- **Provider cache is keyed by `src` string.** `loadComposite` checks `composites.find(c => c.src === src)` before appending; repeated calls for the same `src` are idempotent and return the existing `Composite.Resource`. Callers don't need to dedup themselves, but they also shouldn't assume a fresh object on each call.
- **Publishing coordination with downstream consumers.** The new public surface (`engine.setCompositeProvider`, `engine.getCompositeProvider`, `engine.addEntityFromComposite`, and `Composite.Provider.loadComposite`) is consumed by downstream packages that pin `@dcl/ecs` as a peer dependency. After publishing a release that includes these methods, downstream consumers need to bump their pinned `@dcl/ecs` before their typechecks resolve the new symbols. `creator-hub/packages/asset-packs` is the canonical example.

## Build-time scan hardening (security)

`getAllComposites` exposes a recursive `**/composite.json` scan over the user's working directory. To prevent a malicious or compromised npm dependency from injecting custom component schemas into the auto-generated `~sdk/composite-components` virtual module — where they could shadow names the scene author intended to register — the scan applies three guards (test coverage in `test/sdk-commands/logic/composite-scan.spec.ts`):

- **`node_modules` excluded from the glob.** A `composite.json` shipped by an npm dep is silently skipped. Asset packs must live under the scene's own working tree.
- **16 MB cap (`COMPOSITE_FILE_MAX_BYTES`) before `JSON.parse`.** Reject `.composite` / `composite.json` files larger than this. Bounds the build-time-DoS surface — `JSON.parse` of arbitrary multi-GB input would otherwise OOM the dev/build process.
- **Malformed `composite.json` logged-and-skipped, not silently swallowed.** Earlier versions had a bare `catch {}` that masked parse errors; now they emit a `debug` log so a misshapen file surfaces without breaking the build.

The `**/*.composite` scan is also size-capped via the same constant. The `node_modules` exclusion applies only to the `composite.json` scan — `.composite` files inside `node_modules` are an unrealistic shape and are not specifically excluded today.

## Related code

- `packages/@dcl/ecs/src/composite/index.ts` — `Composite.instance()` wrapper (returns the root entity).
- `packages/@dcl/ecs/src/composite/instance.ts` — `instanceComposite`'s sync recursion through `CompositeRootComponent` (the v1 lazy-recursion blocker).
- `packages/@dcl/ecs/src/engine/index.ts` — `addEntityFromComposite`, intentionally sync, throws on cache miss.
- `packages/@dcl/sdk/src/composite-provider.ts` — `loadComposite`, dedup, decode helpers (`decodeFromLoader`, `decodeFromBytes`).
- `packages/@dcl/sdk-commands/src/logic/composite.ts` — `getAllComposites` (both globs + scan hardening); `renderComponentRegistrationsModule` (emits the `~sdk/composite-components` source).
- `packages/@dcl/sdk-commands/src/logic/bundle.ts` — esbuild plugin handlers for the `~sdk/all-composites` and `~sdk/composite-components` virtual modules.
- `creator-hub/packages/asset-packs/src/actions.ts` — `handleSpawnEntity` cache-aware preload.
- `test/ecs/composite.spec.ts`, `test/ecs/add-entity-from-composite.spec.ts` — coverage for the return-value fix and the preload-then-spawn round trip; safe to extend without needing a `~system/Runtime` mock.
- `test/sdk-commands/logic/composite-scan.spec.ts` — coverage for the `node_modules` exclusion, size cap, and malformed-JSON skip.
