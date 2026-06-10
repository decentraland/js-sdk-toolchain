# `sdk-commands ui-preview`

Preview your scene's `@dcl/react-ecs` UI in the browser, with hot-reload — no 3D
client, no rebuild loop. Edit a file, save, see the result in under a second.

```bash
npm run ui-preview          # with "ui-preview": "sdk-commands ui-preview" in package.json scripts
# or, from anywhere:
sdk-commands ui-preview --dir ./my-scene
```

---

## Quick start (creators)

### 1. Run it — zero config

```bash
cd my-scene        # any SDK7 scene, after npm install
sdk-commands ui-preview
```

The browser opens and runs your scene's `main()` (the same entry the runtime
executes in-world). Whatever UI your scene registers on boot —
`ReactEcsRenderer.setUiRenderer(MyUi)` — renders immediately. Edit any UI file
and the page hot-reloads.

> **Seeing a blank canvas?** Your UI is probably *state-gated* — it returns
> `null` until gameplay creates some state (a `GameState` component, a
> `visible` flag, …). In-world you'd also see nothing until that state exists.
> That's what step 2 is for.

### 2. Add panels — preview every screen of your scene

Create `ui-preview.tsx` in the scene root. It registers your UI and exports a
map of **named panels**; each one puts the UI into a state worth looking at:

```tsx
// ui-preview.tsx — preview-only, never deployed with the scene
import { engine } from '@dcl/sdk/ecs'
import { GameState } from './src/components'
import { setupUi } from './src/ui'

setupUi() // same call your scene makes in-world

export default {
  'Playing HUD': () => GameState.create(engine.addEntity(), { state: 'playing', score: 0 }),
  'Game over':   () => GameState.create(engine.addEntity(), { state: 'ended', score: 1250 }),
  'Shop open':   () => openShop()
}
```

A **Scene** section appears in the sidebar with one entry per panel. Selecting
one reloads with clean state and applies it — so you can flip through every
screen of your game without playing to reach them.

### 3. Add stories — a catalog of your components

Drop a `*.stories.tsx` next to any component (Storybook's CSF, simplified —
every named function export is a story):

```tsx
// src/ui/components/FrostyButton.stories.tsx
import { FrostyButton } from './FrostyButton'

export default { title: 'Components/FrostyButton' } // optional; defaults to the file path

export const Primary = () => <FrostyButton label="Play" onPress={() => {}} />
export const Secondary = () => <FrostyButton label="Cancel" variant="secondary" onPress={() => {}} />
```

Every stories file becomes a sidebar group automatically — no registration, no
config. Selecting a story renders **that component alone**, centered on the
canvas, swapped live (no reload). New stories files are discovered without
restarting the server.

### The toolbar

- **canvas** — device presets. Sizes are *device* resolutions; the preview
  applies the same content-scale the client does (`min(w/720, h/720)`), so your
  px values and font sizes look exactly as in-world. The **iPhone 14 Pro**
  preset is the native 2556×1179 — producing the same 1561×720 canvas and
  ~1.64 devicePixelRatio a real device reports — and flips `isMobile()` to
  `true`, so responsive layouts render their mobile form. The choice persists
  across reloads.
- Clicks work: `onMouseDown`/`onMouseUp`/`onClick` fire through the real
  pointer systems. `useState`/`useEffect` work — timers tick, counters count.
- Errors appear in a red overlay at the bottom instead of a blank page.

### Flags

| Flag | Meaning |
| --- | --- |
| `--dir <path>` | Scene directory (default: cwd) |
| `--entry <file>` | Explicit entry file |
| `-p, --port <n>` | Server port (default: auto) |
| `--no-browser` | Don't auto-open the browser |
| `--mobile` | Force `isMobile()` to `true` regardless of canvas |

### What's real and what's mocked

Runs your scene's **own installed `@dcl/sdk`** — the exact version you deploy.
Engine, reconciler, pointer events: all real. Host services (network, players,
storage, signed fetch) are neutralized: calls succeed but return empty data, so
UIs show their empty/disconnected state ("0 points", "Unranked"). If something
expects shaped host data and crashes, the error overlay tells you exactly what.

### Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Blank canvas, no errors | UI is state-gated → add a `ui-preview.tsx` panel that seeds the state (see step 2). |
| Images missing | Texture `src` must be a path inside the scene folder (served automatically) or an absolute URL. |
| "Profile not initialized. Call syncEntity inside main()" | Real SDK guard — the scene calls `syncEntity` at module scope; it would throw in-world too. |
| UI bigger/smaller than in the client | Don't size the browser window to judge scale — pick a canvas preset; the content-scale matches the client per preset. |
| Panel taller than the canvas | The canvas auto-zooms to fit the window; pick a larger preset (1920×1080) to see more. |

Layout uses the browser's flexbox, which matches the client's Yoga layout very
closely but is not guaranteed pixel-exact. Fonts are browser approximations of
the in-world fonts.

---

## How it works (maintainers)

The scene's UI is produced by the react-ecs reconciler writing ECS components
(`UiTransform`/`UiText`/`UiBackground`/…) to an engine. That step has **no
rendering-backend dependency** — the client (Godot/Unity/Bevy) is just one
consumer. This command runs that exact pipeline in the browser and renders the
component tree to DOM instead.

1. **Entry** (`index.ts`) — resolves the entry (see below), then bundles it
   together with the browser harness via esbuild (`serve` + `watch` give
   live-reload for free). `@dcl/sdk/ecs`, `/react-ecs` and `/math` are pinned
   (via `require.resolve` from the scene dir, so any SDK package layout works)
   to the **scene's own** copies — scene UI and harness share one engine. All
   other sdk modules (`network`, `players`, `server`, …) are the scene's REAL
   implementations: a catch-all esbuild plugin replaces every `~system/*` host
   module with a Proxy whose every import is a no-op returning
   `Promise.resolve({ data: [], events: [] })`, so host calls are neutralized
   at the bottom layer and every named export always exists regardless of SDK
   version. (The Proxy lives on the module's *prototype* so esbuild's `__toESM`
   own-key copying doesn't drop the names.) Only `@dcl/sdk/platform` is mocked —
   older SDKs lack it and the preview drives `isMobile()` from the canvas
   selector. A second tiny HTTP server serves the scene's static files so
   textures load.
2. **Harness** (`harness/`, bundled at runtime — excluded from the Node tsc
   build and copied to `dist` by the build script):
   - `scene-main.ts` — boots the preview, builds the sidebar (Scene panels +
     story groups), applies the hash-routed selection, runs the frame loop.
   - `renderer.ts` — ticks the global engine the scene's `setUiRenderer`
     targets, reads the UI tree, synthesizes pointer events for clicks, seeds
     `UiCanvasInformation` (+ devicePixelRatio).
   - `dom.ts` / `enums.ts` — translate `UiTransform` → CSS flexbox; textures
     support `uvs` atlas sub-rects, `nine-slices` (border-image), center,
     stretch.
   - `public/index.html` — toolbar, sidebar, canvas content-scale mirroring the
     client's `apply_ui_zoom` (`min(w/720, h/720)`), error overlay, esbuild
     live-reload hook.
3. **Stories discovery** — `preview:stories` is a virtual module produced by an
   esbuild plugin that re-globs `**/*.stories.{tsx,ts,jsx,js}` on every rebuild
   and registers `watchDirs`, so added/removed stories files are picked up
   without restarting. Story selection swaps the main UI renderer live
   (`ReactEcsRenderer.setUiRenderer`); Scene panels keep reload semantics since
   they mutate game state.

### Entry resolution

1. `--entry <file>` if given.
2. `ui-preview.tsx` in the scene root, when present.
3. **Zero-config fallback**: the scene's own `main()` from `src/index.ts`.
4. If no `main()` is found, a starter `ui-preview.tsx` is scaffolded
   (best-effort detecting the scene's `setupXxxUi()`).

### Maintenance notes

- `harness/**` is browser code; it is **excluded** from `tsconfig.json` and
  copied verbatim to `dist/commands/ui-preview/harness` by the `build` script.
  If you add harness files, the `cp -r` already covers the folder.
- Caveats (shared with the standalone `@dcl/react-ecs-preview` sandbox):
  browser flexbox ≈ the client's Yoga (not pixel-exact); fonts/textures are
  approximations; host data is empty so panels show empty state; pointer sim
  is click-only.

### Validation matrix

Test scenes live in `…/Decentraland/test/ui-preview-scenes/` (see its README):
`ui-kitchen-sink` (every react-ecs feature incl. uvs atlas + nine-slice, plus a
stories file), `ui-minimal` (zero-config path), `ui-host-apis` (module-scope
host-API usage). Real scenes validated: world-cup-prediction-game (SDK 7.23),
survival-game (SDK 7.20 — different package layout, atlas-heavy HUD), and
SlidePenguin (state-gated screens + component stories).
