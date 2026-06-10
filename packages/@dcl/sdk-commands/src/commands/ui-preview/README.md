# `sdk-commands ui-preview`

Renders a scene's `@dcl/react-ecs` UI in the browser with hot-reload, so content
creators can validate UI layout without launching the full 3D client.

```bash
npm run ui-preview          # in a scene (script → sdk-commands ui-preview)
# or
sdk-commands ui-preview --dir ./my-scene
```

## How it works

The scene's UI is produced by the react-ecs reconciler writing ECS components
(`UiTransform`/`UiText`/`UiBackground`/…) to an engine. That step has **no
rendering-backend dependency** — the client (Godot/Unity/Bevy) is just one
consumer. This command runs that exact pipeline in the browser and renders the
component tree to DOM instead.

1. **Entry** (`index.ts`) — finds the scene's `ui-preview.tsx` (or scaffolds one,
   best-effort detecting the scene's `setupXxxUi()`), then bundles it together
   with the browser harness via esbuild (`serve` + `watch` give live-reload for
   free). `@dcl/sdk/ecs`, `/react-ecs` and `/math` are pinned (via
   `require.resolve` from the scene dir, so any SDK package layout works) to the
   **scene's own** copies — scene UI and harness share one engine. All other sdk
   modules (`network`, `players`, `server`, …) are the scene's REAL
   implementations: a catch-all esbuild plugin replaces every `~system/*` host
   module with a Proxy whose every import is a no-op returning
   `Promise.resolve({ data: [], events: [] })`, so host calls are neutralized at
   the bottom layer and every named export always exists regardless of SDK
   version. (The Proxy lives on the module's *prototype* so esbuild's `__toESM`
   own-key copying doesn't drop the names.) Only `@dcl/sdk/platform` is mocked —
   older SDKs lack it and the preview drives `isMobile()` from the canvas
   selector. A second tiny HTTP server serves the scene's `images/`/audio so
   textures load.
2. **Harness** (`harness/`, bundled at runtime — excluded from the Node tsc build
   and copied to `dist` by the build script):
   - `scene-main.ts` — boots the preview, builds the panel switcher, runs the
     frame loop.
   - `renderer.ts` — ticks the global engine the scene's `setUiRenderer` targets,
     reads the UI tree, synthesizes pointer events for clicks, seeds
     `UiCanvasInformation`.
   - `dom.ts` / `enums.ts` — translate `UiTransform` → CSS flexbox.
   - `public/index.html` — toolbar (panel switcher + canvas presets), canvas
     content-scale that mirrors the client's `apply_ui_zoom`
     (`min(w/720, h/720)`), and the esbuild live-reload hook.

## Entry resolution

1. `--entry <file>` if given.
2. `ui-preview.tsx` in the scene root, when present.
3. **Zero-config fallback**: the scene's own `main()` from `src/index.ts` — the
   same entry the runtime executes in-world, so whatever UI the scene registers
   on boot renders with no extra files. (State-gated screens that only appear
   mid-game still need a `ui-preview.tsx` to seed that state.)
4. If no `main()` is found, a starter `ui-preview.tsx` is scaffolded.

## The `ui-preview.tsx` convention (authored by the creator)

```tsx
import { setupMyUi, openShop } from './src/ui'
setupMyUi()                       // same call the scene makes in-world
export default {                  // optional: named panels for the switcher
  'Main HUD': () => {},
  Shop: () => openShop()
}
```

If absent, the command scaffolds a starter (best-effort detecting the scene's
`setupXxxUi` function).

## Component stories (storybook-style)

Any `*.stories.tsx` file in the scene becomes a group in the preview's sidebar
(CSF-lite: optional `export default { title }`; every named function export is a
story rendered in isolation, centered on the canvas):

```tsx
// src/ui/components/FrostyButton.stories.tsx
import { FrostyButton } from './FrostyButton'
export default { title: 'Components/FrostyButton' }
export const Primary = () => <FrostyButton label="Play" onPress={() => {}} />
export const Secondary = () => <FrostyButton label="Cancel" variant="secondary" onPress={() => {}} />
```

Discovery is a virtual module (`preview:stories`) produced by an esbuild plugin
that re-globs on every rebuild and registers `watchDirs`, so adding/removing a
stories file is picked up without restarting. Selecting a story swaps the main
UI renderer live (`ReactEcsRenderer.setUiRenderer`) — no reload; Scene panels
keep reload semantics since they mutate game state.

## Maintenance notes

- `harness/**` is browser code; it is **excluded** from `tsconfig.json` and copied
  verbatim to `dist/commands/ui-preview/harness` by the `build` script. If you add
  harness files, the `cp -r` already covers the folder.
- Caveats (shared with the standalone `@dcl/react-ecs-preview`): browser flexbox
  ≈ the client's Yoga (not pixel-exact); fonts/textures are approximations; data
  is mocked so panels show empty state; pointer sim is click-only.
- Texture fidelity implemented: `uvs` atlas sub-rects (CSS background-size/
  position math from the normalized rect, V origin at bottom), `nine-slices`
  (CSS border-image, async natural-size measurement), `center`, `stretch`.

## Validation matrix

Test scenes live in `…/Decentraland/test/ui-preview-scenes/` (see its README):
`ui-kitchen-sink` (every react-ecs feature incl. uvs atlas + nine-slice),
`ui-minimal` (auto-scaffold path), `ui-host-apis` (module-scope host-API usage).
Real scenes validated: world-cup-prediction-game (SDK 7.23) and survival-game
(SDK 7.20 — different package layout, atlas-heavy HUD).
