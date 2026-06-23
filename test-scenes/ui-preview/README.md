# ui-preview example scenes

Three SDK7 scenes that demo and validate [`sdk-commands ui-preview`](../../packages/@dcl/sdk-commands/src/commands/ui-preview)
— the browser preview for react-ecs UIs with hot-reload, screen panels, and
storybook-style component stories.

## Run an example

Until `ui-preview` ships in a published `@dcl/sdk-commands`, run it from this
repo's build:

```bash
# once, from the repo root
make install && make build       # or: cd packages/@dcl/sdk-commands && npm i && npm run build

# install the scene's SDK and preview it
cd test-scenes/ui-preview/ui-kitchen-sink
npm install
node ../../../packages/@dcl/sdk-commands/dist/index.js ui-preview
```

(Once released: just `npm install && npm run ui-preview`.)

## The scenes

| Scene | What it demonstrates |
| --- | --- |
| `ui-kitchen-sink` | Every react-ecs feature, one sidebar panel per area: **Layout** (flex row/column, %, minWidth, absolute+zIndex+opacity, borders/per-corner radius), **Text** (3 fonts, `<b>/<i>`, 3×3 textAlign, wrap), **Widgets** (Input, Dropdown, Button variants), **Textures** (stretch, **uvs atlas**, **nine-slices**, center), **Interactive** (useState clicks, useEffect timer). Plus `src/Badge.stories.tsx` showing the component-stories convention. Use it as a copy-paste reference. |
| `ui-minimal` | The zero-config path: **no `ui-preview.tsx`** — the command runs the scene's `main()` and the UI renders with no setup. |
| `ui-host-apis` | Worst-case host-API usage: `registerMessages`/`isServer`/`syncEntity` (`@dcl/sdk/network`), `getPlayer` (`/players`), `movePlayerTo`/`getRealm`/`signedFetch` (`~system/*`) — at module scope and in render. Every row must render a value; nothing may crash. Also shows the preview surfacing real SDK guards (module-scope `syncEntity` shows the SDK's own "call inside main()" error). |

## Expected results

- All bundles build with zero errors; pages render with the error overlay hidden.
- Kitchen-sink **Textures** panel: the 4 uvs cells each show ONE solid color
  (red/green/blue/yellow) cut from the single 4-color `images/atlas.png` — not
  the whole sheet — and the nine-slice frames keep crisp borders at all 3 sizes.
- Kitchen-sink sidebar shows a **Kitchen Sink/Badge** stories group; selecting a
  story renders that badge alone, centered, without a page reload.
- `ui-minimal` renders "scaffold-detection works" with no extra files.
- `ui-host-apis` rows: `getPlayer()` → null, `registerMessages` → room,
  `getRealm`/`signedFetch`/`movePlayerTo` → ok (stubbed), `syncEntity` → guarded.

These scenes are also exercised manually against real games (world-cup on SDK
7.23, survival-game on SDK 7.20, SlidePenguin with state-gated screens) — see
the command README's validation matrix.
