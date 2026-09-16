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

- **The project root's id is path-only.** Today every preview id — the project's and each file's —
  is path-only. [PR #1529](https://github.com/decentraland/js-sdk-toolchain/pull/1529) (open at
  time of writing) would version *per-file* hashes by mtime as
  `b64-<base64(path\0mtimeMs-machineId)>` while deliberately leaving the project directory's own
  entity id path-only. The realm key must keep deriving from `b64HashingFunction(projectRoot)`: a
  content- or mtime-shaped input would re-partition comms on every file save.
- **The path is absolute, and byte-exact.** `workspaceFromFolders` resolves each project's
  `workingDirectory` before it reaches any caller, but `path.resolve` normalizes the separator
  style — **not** drive-letter case on Windows. `e:\dev\scene` and `E:\dev\scene` are the same
  project and yield two different realm keys. An explorer deriving the key independently must use
  the byte-identical path string the CLI used, casing included; when in doubt, read the scene
  entity id off the preview server instead of re-deriving it.
- **`machineId` is part of the input.** Two developers who check the same project out to the same
  path still get different realms.

The non-overflow key is reversible base64 of an absolute path and a hostname, so it can carry a
developer's directory layout and machine name. That is unchanged from the entity ids the preview
server already serves locally, but the same string travels as a comms realm — worth knowing
before it leaves the machine.

## Who derives it

`sdk-commands` passes no realm flag to the spawned preview engine. Since
[bevy-explorer#1137](https://github.com/decentraland/bevy-explorer/pull/1137) the engine derives
the key itself from the preview server's `b64-` scene entity id — the client and the server-mode
Pulse listener compute the same string independently — so the spawn needs no `--pulse-realm`
argument and a client pointed at the same preview lands in the same partition unprompted.

The one place the key is *stated* rather than derived: the mobile preview deep link carries
`pulse-realm=<key>` (and, under `--dclenv zone`, the zone `pulse-server=` endpoint) so a
phone-side explorer can join the partition without re-deriving it —
`commands/start/dcl-env.ts`.

## Parcel bounds

Pulse's `FieldValidator` disconnects peers that report invalid parcel indices, so a scene outside
Genesis City bounds would join a realm and then silently fail to get comms.

`sdk-commands` cannot produce such a scene: `assertValidScene`
([`logic/scene-validations.ts`](../packages/@dcl/sdk-commands/src/logic/scene-validations.ts))
already rejects any parcel failing `isInsideWorldLimits` from `@dcl/schemas` with
`SCENE_VALIDATIONS_COORDINATES_OUTSIDE_LIMITS`, and `start` reaches it through
`getValidWorkspace` → `assertValidProjectFolder` → `getValidSceneJson`. The preview fails to start
rather than starting without comms.
