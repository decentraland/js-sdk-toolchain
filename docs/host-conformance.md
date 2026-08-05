# Host conformance: what the network layer requires of a runtime

The authoritative-multiplayer network layer (`packages/@dcl/sdk/src/network/`) is
written against the `~system` APIs declared in
[`packages/@dcl/js-runtime/apis.d.ts`](../packages/@dcl/js-runtime/apis.d.ts). It
assumes more of them than the type signatures say. This is the checklist a new
host — the Bevy client, a headless server, a test harness — validates against
before a multiplayer scene can be trusted on it.

Scope is Layer A only: the scene-side network layer. Rendering, comms transport,
and the CRDT protocol itself are out of scope.

## REQUIRED

### 1. `EngineApi.isServer()` answers truthfully, exactly once, and resolves

- Declared at `apis.d.ts:943-947` (`IsServerResponse.isServer`) and `apis.d.ts:968`.
- Called once per transport at boot: `network/runtime-context.ts:20`. The answer
  populates an atom that never re-resolves; a host cannot change a peer's role
  mid-session.
- **A promise that never settles wedges the peer.** Received comms is buffered
  until the role is known (`network/message-bus-sync.ts:155-166`, cap 256
  messages) and then dropped with a loud error. Outgoing CRDT is *not* buffered:
  before the role resolves it is broadcast (`message-bus-sync.ts:85-96`), which
  is safe but wasteful. Resolve promptly.
- Exactly one peer per room may answer `true`. Two authoritative servers means
  two worlds, and nothing in the layer detects it.

### 2. `CommunicationsController.sendBinary` honours per-peer addressing

- `PeerMessageData.address` — `apis.d.ts:74-77`. **An empty array means
  broadcast**; a non-empty array must be delivered to exactly those addresses.
- Addresses are the peer identities `getUserData` reports, plus the reserved
  `'authoritative-server'` (`network/constants.ts:7`). The host must route that
  identity to the authoritative peer.
- Targeted delivery is load-bearing, not an optimization:
  - a client sends **all** its CRDT to `['authoritative-server']` only
    (`message-bus-sync.ts:95-96`, `:110`) — if the host ignores the address list
    and broadcasts, every client sees every other client's unvalidated writes;
  - state hydration answers one requester: `SERVER_ANNOUNCE` and each
    `RES_CRDT_STATE` chunk go to `[sender]` (`message-bus-sync.ts:216`, `:220`,
    `:224`) — if these are broadcast, every already-synced client re-hydrates
    from another client's dump.
- The server's own fan-out uses the empty-array broadcast
  (`network/server/index.ts:169-177`).
- `sendBinary` doubles as the receive poll: its response drains the peer's inbox
  (`message-bus-sync.ts:115-116`). A host that never returns queued messages
  from `sendBinary` delivers nothing, however well it accepts sends.

### 3. Avatar components are populated for connected players

- The players helper queries `PlayerIdentityData` + `AvatarBase`
  (`packages/@dcl/sdk/src/players/index.ts:41`). Both must arrive as CRDT on the
  scene's stream, one entity per connected player.
- The network layer depends on this for hydration, not just for scene code: one
  of the events that drives a client to request world state is its **own** player
  entity appearing (`message-bus-sync.ts:288-291`). Other triggers remain — the
  realm connecting, and a tick-driven retry — so a host that never writes these
  components degrades hydration rather than breaking it outright.
- On the current runtime these arrive in the `crdtSendToRenderer` **response**
  (`apis.d.ts:956-960`, "the CRDT changes back from the renderer ... like the
  player's position"), which is why a host without a renderer has none — see
  the gap below.

### 4. `EngineApi` CRDT round-trip, including on a headless host

- `crdtSendToRenderer` (`apis.d.ts:956-960`) and `crdtGetState`
  (`apis.d.ts:961-965`).
- `@dcl/sdk` attaches the renderer transport and a per-frame `pollEvents` at
  **import time**, before any role is known (`packages/@dcl/sdk/src/index.ts:10-11`,
  `:19`). A host cannot opt out of this: the scene entrypoint contract has no
  initializer hook, so importing `@dcl/sdk` is what boots the engine.
- Therefore **a headless host must still implement `crdtSendToRenderer`,
  `crdtGetState` and `sendBatch`**. Two shapes are known to work:
  - *Consume the stream.* The headless host in this repo feeds
    `crdtSendToRenderer` straight back into its own engine:
    `packages/@dcl/sdk-commands/src/commands/code-to-composite/scene-executor.ts:109-112`.
    Here the "renderer" transport is the host's primary CRDT ingestion path.
  - *Stub it.* `crdtSendToRenderer: async () => ({ data: [] })`,
    `crdtGetState: async () => ({ hasEntities: false, data: [] })`,
    `sendBatch: async () => ({ events: [] })` (the shape used for the other
    stubs at `scene-executor.ts:113-121`). `pollEvents` tolerates an empty event
    list (`packages/@dcl/sdk/src/observables.ts:208-209`).
- A *missing* or throwing `crdtSendToRenderer` is survivable but noisy: the
  transport swallows the rejection and logs it every frame
  (`packages/@dcl/sdk/src/internal/transports/rendererTransport.ts:26-31`).
  Prefer an explicit stub.

**Why the renderer path is not gated off on the server.** It would be a natural
saving — the authoritative server has no renderer — and it was considered and
rejected in the Phase 5 boot cleanup. Three reasons: the role is only known
asynchronously, so the import-time attach cannot be skipped on it at all; the
one headless host that can be inspected here treats `crdtSendToRenderer` as the
channel it *receives* the world on (`scene-executor.ts:109-112`), so gating it
would blind that class of host entirely; and `@dcl/hammurabi-server` is an
external package resolved by `npx` at run time
(`packages/@dcl/sdk-commands/src/commands/start/hammurabi-server.ts:8`, `:13`),
not vendored here, so its `EngineApi` implementation cannot be read. Absent
evidence that the round trip is a no-op there, a gate risks silently breaking
the server. The cost of leaving it attached is bounded and visible. Revisit if
and when a host documents `crdtSendToRenderer` as a no-op under `isServer`.

## GAPS TODAY

Known-missing capabilities. Each one is a defect the network layer cannot fix
from inside; the first two are pinned as `it.failing` in
`test/sdk/network/defects-red.spec.ts` (#11, #13). Full measurements in
[network-peer-visibility.md](network-peer-visibility.md).

- **No peer roster.** Nothing tells a scene who is in the room. On a server
  there are no avatar components to infer one from (no renderer, and nothing
  writes them server-side), and `~system/Players.getConnectedPlayers` is
  unproven on a server runtime and marked deprecated.
- **No "broadcast except X" primitive.** `PeerMessageData.address` can only
  name recipients (`apis.d.ts:76-77`), so excluding one peer requires naming all
  the others — i.e. a roster. Consequence: every accepted client write is echoed
  back to its own sender (`network/server/index.ts:169-177`, red #11). A host
  that adds a wire-level exclude removes the echo outright.
- **No component-wide change subscription in `@dcl/ecs`.** `onChange` is
  registered per entity, so a player whose entity is created and destroyed
  inside one frame is never observed (red #13). This one is an SDK gap that only
  shows up as host behavior — it is visible precisely because players arrive over
  the wire rather than through local writes.
- **Client CRDT timestamps are trusted.** The server validates ownership and
  permissions but not the clock. See
  [network-timestamp-trust.md](network-timestamp-trust.md).

## VERIFICATION

The 3-engine harness (`test/sdk/network/utils/harness.ts`) simulates one
authoritative server and two clients with the routing rules above, and the
convergence oracle (`test/sdk/network/utils/convergence.ts`) compares engines by
network identity rather than local entity id. Together they are the conformance
smoke test for a routing implementation.

```bash
# prerequisite: server-client-connectivity.spec.ts imports the compiled package
make build

# full network suite
node_modules/.bin/jest --forceExit --testPathPattern='test/sdk/network'

# 3-engine harness + convergence oracle only
node_modules/.bin/jest --forceExit \
  --testPathPattern='test/sdk/network/(characterization-flow|late-join-hydration|reconnect-convergence|server-client-connectivity)'
```

Expected: green, with `defects-red.spec.ts` reporting #11 and #13 as the only
`it.failing` pins. Two failures there is the pass condition, not a regression.

To port the harness against a real host, replace the `sendBinary` passed to
`addSyncTransport` (`test/sdk/network/utils/harness.ts:136-143`) with one that
crosses the host's comms. Every runtime dependency of the layer — engine,
`sendBinary`, `getUserData`, `isServer`, transport name, and the number of
startup ticks whose CRDT is suppressed — is a parameter of that one function
(`packages/@dcl/sdk/src/network/message-bus-sync.ts:46-52`); nothing else needs
stubbing.

## Related

- [network-peer-visibility.md](network-peer-visibility.md) — the measurements
  behind the roster and same-frame-player gaps.
- [network-timestamp-trust.md](network-timestamp-trust.md) — the timestamp trust
  boundary.
- [wire-message.md](wire-message.md) — the CRDT wire format underneath all of
  this.
</content>
