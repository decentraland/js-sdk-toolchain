# Peer visibility limits in the network layer

Two known defects in the authoritative network layer cannot be fixed inside
that layer. Both come down to something the network code is never in a position
to observe: who is connected to the room, and which components changed between
two frames. This note records what was measured, why the obvious fixes are worse
than the defects, and what a real fix would need.

Both have a red test pinned as `it.failing` in
`test/sdk/network/defects-red.spec.ts` (#11 and #13). Leave them failing until
the underlying layer changes.

## The server does not know who is connected

`broadcastBatchedMessages` in `packages/@dcl/sdk/src/network/server/index.ts`
takes an `excludeSender` argument and does nothing with it beyond logging. Every
accepted client write is re-broadcast to the whole room, including back to the
client that sent it. That client already applied the change locally, so the echo
is a wasted round trip for every write in the scene.

Removing the echo means addressing the broadcast to everyone except the sender.
The comms API has no primitive for that: `PeerMessageData.address` in
`packages/@dcl/js-runtime/apis.d.ts` is a list of recipients, and an empty list
means broadcast. To exclude one peer, you must name all the others — which
requires a roster the server does not have.

### What the server actually holds

Instrumenting the red #11 scenario (an authoritative server and two clients,
where only the first client writes) shows everything available server-side after
the write propagates:

```
players= []  avatars= 0  createdBy= ["clientA"]
clientB-sent-ever= []
```

Three candidate rosters, and why each one fails:

- **The players helper is empty.** `definePlayerHelper` reads
  `PlayerIdentityData` and `AvatarBase`, which the renderer writes into a
  scene's CRDT stream. An authoritative server has no renderer, and nothing in
  this repository writes those components server-side. The query returns
  nothing.
- **Observed senders are incomplete by construction.** The server knows
  `clientA` because `clientA` wrote something, recorded in `CreatedBy`. A peer
  that only listens never appears. Excluding the sender from a roster built this
  way would leave the room with nobody to address.
- **`~system/Players.getConnectedPlayers` is unproven here.** The runtime API
  exists in `packages/@dcl/js-runtime/apis.d.ts`, but nothing in the SDK calls
  it, it's marked for deprecation, and the only headless host in this repository
  (`packages/@dcl/sdk-commands/src/commands/code-to-composite/scene-executor.ts`)
  doesn't mock `~system/Players` at all. There's no evidence the server host
  implements it.

### Why a partial roster is worse than the echo

The failure modes aren't symmetric. If a roster comes back empty, the code falls
back to broadcasting and the fix does nothing in production while passing in
tests. If a roster comes back *partial*, the server stops addressing the peers
it omits, and a client that never writes silently stops receiving world updates.

Trading a measurable bandwidth cost for possible silent divergence is the wrong
direction. Delivery-level exclusion is only safe on a roster known to be
complete.

### What a real fix needs

Either of these makes the exclusion sound:

- **A wire-level exclude.** A "broadcast except these addresses" option on
  `sendBinary` is the correct primitive. It costs nothing per peer, needs no
  roster in the scene, and can't go stale.
- **A roster the server host commits to.** If the host guarantees
  `getConnectedPlayers` reflects the comms room on a server runtime, pass it into
  `addSyncTransport` and target the roster minus the sender, falling back to
  broadcast whenever the roster is empty.

## A player that joins and leaves in one frame is invisible

The per-frame diff in `packages/@dcl/sdk/src/players/index.ts` compares the
current `PlayerIdentityData` and `AvatarBase` entities against a cached map. A
player whose entity is created and destroyed between two system runs never
appears in either snapshot, so neither `onEnterScene` nor `onLeaveScene` fires.

This isn't a matter of polling more carefully. Instrumenting the red #13
scenario shows what survives to the next system run:

```
system-saw= ["rows=0 dirty=[512] has(512)=false val=null"]
onChange-fired-on-local-writes= ["null"]
```

The entity id is still in the dirty set. The value is gone: `has()` is false and
the component reads as null, so the player's address is unrecoverable.

The second line rules out the event-driven alternative for local writes. That
probe subscribed `onChange` up front on the exact entity id — something the real
helper can never do, since the entity doesn't exist when the helper starts — and
the callback still fired once, with `undefined`. `create`, `createOrReplace`,
and `deleteFrom` in
`packages/@dcl/ecs/src/engine/lww-element-set-component-definition.ts` never
invoke `__onChangeCallbacks`. Those callbacks run from the flush in
`packages/@dcl/ecs/src/engine/index.ts`, which reports the settled state, and a
create and a delete in the same frame collapse to a single notification. The
outgoing wire collapses the same way: `getCrdtUpdates` emits only a
`DELETE_COMPONENT`, so the value never reaches another peer either.

### The wire path is different, and it defines the requirement

A player never arrives through local writes in production. The renderer delivers
`PlayerIdentityData` over CRDT, so the case that matters is a `PUT_COMPONENT`
and a `DELETE_COMPONENT` for the same entity arriving in one batch. Feeding
exactly that through a transport, with `onChange` again pre-subscribed on the
entity id, gives a different result:

```
onChange-fired= ["{\"address\":\"0xplayer\",\"isGuest\":false}", "null"]
system-saw= ["rows=0"]
```

The receive path applies each message in turn and notifies for each, so the
callback fires twice and **the first one carries the address**. The value is
genuinely observable on the wire path; it's the poll that misses it, because by
the time a system runs the entity is gone again.

That difference is the whole follow-up. Nothing prevents the players helper from
seeing a renderer-delivered join and leave in the same frame except the shape of
the subscription: `onChange` is registered per entity, and an entity that
doesn't exist yet can't be subscribed to. The requirement on `@dcl/ecs` is
therefore a **component-wide change subscription** — "call me for every change to
`PlayerIdentityData`, whatever the entity" — not a change to when notifications
fire. With that in place, every player that arrives the way real players arrive
is reported correctly, and only the purely local same-frame case remains
unreachable.

Note that red #13's fixture uses local writes, so it exercises the one variant
that stays unfixable even after the subscription lands. Rewrite the fixture to
drive the component over a transport when picking this up.

### What was fixed, and what wasn't

The diff loop is now a mark-and-sweep poll over both directions, which fixes two
real bugs the old shortcut hid:

- A frame in which one player joins and another leaves keeps the entity count
  equal, and the old `players.length === playerEntities.size` check skipped the
  whole frame, missing the join.
- Departures used to be reported by a per-entity `AvatarBase.onChange`
  registered when the player was first seen, which never fired for a player
  whose entity was removed whole. The sweep uses the cached address instead.

Every player visible for at least one frame is now reported correctly. A player
who comes and goes inside a single frame is still missed, and stays missed until
the component-wide subscription described above exists.

## What not to do now

Do not make either test pass by narrowing the fix to the test:

- **Do not build the roster from observed senders.** It reaches only peers that
  have already written, which is precisely the set that doesn't need the echo.
- **Do not patch `PlayerIdentityData.create` from inside the players helper.**
  Local writes are the only calls it would intercept, and renderer-driven
  players arrive through `updateFromCrdt`. The test goes green and production is
  unchanged.
- **Do not fire `onChange` synchronously on local writes** as a targeted fix. It
  redefines `onChange` for every scene, in a package held to 100% coverage, and
  it addresses the wrong half of the problem: on the path players actually
  arrive by, the notification already carries the value. Add the component-wide
  subscription instead.

## Related

- `packages/@dcl/sdk/src/network/server/index.ts` — `broadcastBatchedMessages`
  and the validator.
- `packages/@dcl/sdk/src/players/index.ts` — the player-diff system.
- `packages/@dcl/ecs/src/engine/lww-element-set-component-definition.ts` —
  component writes, dirty tracking, and change callbacks.
- `packages/@dcl/ecs/src/engine/index.ts` — where `__onChangeCallbacks` runs, and
  why the receive path notifies per message while the flush reports net state.
- [network-timestamp-trust.md](network-timestamp-trust.md) — a second trust
  boundary in the same layer.
