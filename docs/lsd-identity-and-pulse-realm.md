# LSD identity and the Pulse realm key

Canonical contract for **Local Scene Development (LSD)** identity: the preview scene id and the
Pulse realm key derived from it. `sdk-commands`, unity-explorer and bevy-explorer all implement
this; it is documented once here so the implementations can reference a single source instead of
each other.

## Why this needs a canonical definition

Pulse partitions visibility by **exact realm-string match**, and no realm key is ever exchanged —
every party derives it independently from the project path. That is what makes local previews
isolated without any handshake, and it is also the failure mode: if two implementations derive
even slightly different strings, nothing errors. The peers just never see each other.

This is the same class of bug as the LiveKit `preview-${sceneId}` vs `LocalPreview:{sceneId}`
room-name mismatch, and the reason this contract is written down rather than reimplemented.

## The derivation

```
machineId      = os.hostname() || os.userInfo().username
previewSceneId = "b64-" + base64(`${absoluteProjectRoot}-${machineId}`)
realmKey       = "lsd:" + previewSceneId
```

If `realmKey` exceeds Pulse's `MaxRealmLength` of **255**, it collapses deterministically:

```
realmKey = "lsd:sha256:" + SHA256Hex(previewSceneId)
```

The hash is taken over `previewSceneId` (including its `b64-` prefix), hex-encoded lowercase. The
overflow form is always 75 characters, so it always fits. Truncation is deliberately *not* used —
every party must land on the identical string without coordinating.

### Worked examples

With `machineId = "dev-box"`:

| `absoluteProjectRoot` | `realmKey` |
| --- | --- |
| `/home/dev/my-scene` | `lsd:b64-L2hvbWUvZGV2L215LXNjZW5lLWRldi1ib3g=` |
| `/home/dev/` + `a`×200 | `lsd:sha256:783635fb50eadaed0300d80104920bfc55894d5ad2ab69ab6b48c6ff1ddb9da5` |

The second row's raw key would have been 300 characters.

## Source of truth

[`packages/@dcl/sdk-commands/src/logic/lsd-realm.ts`](../packages/@dcl/sdk-commands/src/logic/lsd-realm.ts)
implements the realm key. It composes — rather than re-derives — `machineId` and
`b64HashingFunction` from
[`logic/project-files.ts`](../packages/@dcl/sdk-commands/src/logic/project-files.ts), which is the
same function the preview server already uses for scene and file entity ids:

| Caller | Uses it for |
| --- | --- |
| `commands/start/index.ts` | `projectHash` on the `Preview started` analytics event |
| `commands/start/server/endpoints.ts` | the scene entity id served to clients, and decoding it back to a path |
| `commands/start/server/file-watch-notifier.ts` | `sceneId` on every hot-reload message, plus per-file hashes |
| `commands/build/index.ts`, `commands/deploy/index.ts`, `commands/export-static/index.ts`, `commands/pack-smart-wearable/index.ts` | `projectHash` on their analytics events |

**Do not add a second derivation.** A new one that agrees today will drift.

## Invariants

- **The project root's id is path-only.** Per-file preview hashes are mtime-versioned
  (`b64-<base64(path\0mtimeMs-machineId)>`), but the project directory's own entity id
  deliberately is not, so scene identity survives edits and reloads. Deriving the realm key from a
  content entry instead of from `b64HashingFunction(projectRoot)` would re-partition comms on
  every file save.
- **The path is absolute.** `workspaceFromFolders` resolves each project's `workingDirectory`
  before it reaches any caller.
- **`machineId` is part of the input.** Two developers who check the same project out to the same
  path still get different realms.

## The `--pulse-realm` gate

`sdk-commands start` passes the realm to the spawned preview engine as `--pulse-realm=<key>`,
identically for bevy and the hammurabi opt-out. It is **off by default**:

```bash
DCL_SERVER_PULSE_REALM=1 npm start
```

Two upstream reasons:

- bevy-headless has no Pulse transport in server mode. `src/bin/headless.rs` never mentions Pulse,
  and `crates/comms/src/pulse/plugin.rs` notes that a multi-tenant server "stays on LiveKit for
  now". Tracked at
  [decentraland/sdk-multiplayer-server#132](https://github.com/decentraland/sdk-multiplayer-server/issues/132).
- Today the headless binary silently ignores unknown arguments, but
  [bevy-explorer#1030](https://github.com/decentraland/bevy-explorer/pull/1030) makes it exit 2 on
  them. Passing the flag unconditionally would break every preview on the default engine the day
  that ships.

**To flip the default on** once a bevy-headless release declares support: set
`PULSE_REALM_DEFAULT = true` in `logic/lsd-realm.ts`. `DCL_SERVER_PULSE_REALM=0` remains the
opt-out.

## Parcel bounds

Pulse's `FieldValidator` disconnects peers that report invalid parcel indices, so a scene outside
Genesis City bounds would join a realm and then silently fail to get comms.

`sdk-commands` cannot produce such a scene: `assertValidScene`
([`logic/scene-validations.ts`](../packages/@dcl/sdk-commands/src/logic/scene-validations.ts))
already rejects any parcel failing `isInsideWorldLimits` from `@dcl/schemas` with
`SCENE_VALIDATIONS_COORDINATES_OUTSIDE_LIMITS`, and `start` reaches it through
`getValidWorkspace` → `assertValidProjectFolder` → `getValidSceneJson`. The preview fails to start
rather than starting without comms.
