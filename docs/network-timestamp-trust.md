# Timestamp trust in the authoritative network layer

The authoritative server decides which client writes survive, but it does not
decide *when* they happened. Clients stamp their own CRDT timestamps and the
server takes them at face value. This note records why that is a problem, what
fixing it costs, and what not to build in the meantime.

## Current behavior

Every component write carries a Lamport timestamp the writer picks. On a client
that timestamp comes from `incrementTimestamp` in
`packages/@dcl/ecs/src/engine/lww-element-set-component-definition.ts`, which
bumps the writer's own per-entity counter. The value travels unmodified inside
`PUT_COMPONENT_NETWORK`.

When the server receives that message, `validateMessagePermissions` in
`packages/@dcl/sdk/src/network/server/index.ts` runs a dry run
(`__dry_run_updateFromCrdt`) against the server's copy of the component. The dry
run is pure last-write-wins conflict resolution: a message whose timestamp beats
the server's stored one is accepted, a message that loses is rejected. The
server then broadcasts the accepted message **with the client's timestamp
intact**, so every other peer resolves the same conflict the same way.

Rejection is the only lever the server has, and it is exercised through
`sendCorrectionToSender`, which replies to the offender alone with a
`CRDT_AUTHORITATIVE` message.

## The risk

Because the number is chosen by the writer and never rewritten, it is a trust
boundary the server does not police:

- **Clock skew.** Two clients that disagree about how far their counters have
  advanced resolve conflicts in favor of whoever counted higher, not whoever
  acted later. A client that reconnects and re-hydrates can come back with a
  counter well ahead of its peers for no reason a player would recognize.
- **Crafted timestamps.** A modified client can send `timestamp: 0xFFFFFFFF` and
  win every subsequent conflict on that entity and component. Nothing in the
  validator caps the value or compares it against the server's own clock. The
  write still has to pass `validateBeforeChange`, so a scene with per-component
  rules is not defenseless — but a scene without them has no protection at all.
- **Corrections inherit the problem.** A correction built from
  `getCrdtState(entity)` carries the server's stored timestamp, which is itself
  a number some client picked earlier.

The scene-visible symptom is a griefer who can pin a component to a value
nobody else can overwrite.

## Why server re-stamping is the fix

The durable answer is for the server to own the clock: on an accepted write it
replaces the client's timestamp with its own monotonic per-entity counter before
broadcasting. Clients then never compete on a number they control, and a crafted
timestamp buys nothing because it is discarded on arrival.

That change is larger than it looks, and the reasons are worth writing down
before someone attempts it:

- **The sender must be corrected, not just the room.** Today the writer applies
  its change locally and the server echoes the same timestamp back, so the echo
  is a no-op. Re-stamping makes the echo differ from what the sender applied, so
  the sender needs the rewritten message too — and it has to override the
  sender's local state, which is what `AUTHORITATIVE_PUT_COMPONENT` and
  `__forceUpdateFromCrdt` already do.
- **Echo suppression interacts.** `lastSentData` in the LWW component definition
  exists so a peer doesn't rebroadcast state it just sent. A rewritten timestamp
  coming back has to update the sender's clock without being mistaken for a new
  local edit that needs sending again.
- **State dumps have to agree.** `engineToCrdt` ships the server's timestamps to
  a hydrating client. Once the server owns the clock those dumps become the
  authoritative baseline, so a client must adopt them wholesale rather than
  merging them against its own counters.
- **`DELETE_COMPONENT` has no force-apply opcode.** The wire has exactly one
  authoritative operation, `AUTHORITATIVE_PUT_COMPONENT`. A re-stamped delete
  has to win on merit, which is why the current correction path picks
  `rejected timestamp + 1`. Server-owned clocks make that arithmetic principled
  instead of a workaround, but only if the delete path gets the same treatment.

## What not to do now

Do not add partial mitigations. In particular:

- **Do not clamp or sanity-check incoming timestamps.** A ceiling ("reject
  anything more than N ahead of the server") is guesswork that breaks legitimate
  reconnects and still lets an attacker advance N at a time.
- **Do not swap Lamport counters for wall-clock time.** It replaces one
  untrusted client number with another, and adds real clock skew to the failure
  modes.
- **Do not re-stamp on the server without also fixing the sender echo path.**
  Rewriting the timestamp on broadcast while leaving the sender on its own value
  produces a permanent split between the writer and everyone else — a worse
  failure than the one being fixed.

Treat timestamp ownership as one change that lands whole, alongside the tests
that pin sender-echo behavior.

## Related

- `packages/@dcl/sdk/src/network/server/index.ts` — validator and correction
  path.
- `packages/@dcl/ecs/src/engine/lww-element-set-component-definition.ts` —
  timestamp allocation, conflict resolution, and force-apply.
- [wire-message.md](wire-message.md) — CRDT wire message format.
