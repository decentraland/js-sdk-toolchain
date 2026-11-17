# Tests must not assert that received state is never sent back

`auth-server` re-sends component state that arrived from a transport; `main`
does not. A test on `main` asserting "nothing was sent" after the engine
received a value passes on `main` and fails on the auth-server sync.

## Why

In `packages/@dcl/ecs/src/engine/lww-element-set-component-definition.ts`,
`createUpdateLwwFromCrdt` on `main` seeds `lastSentData` with the bytes of an
accepted incoming PUT, so the next `getCrdtUpdates` sees nothing new. On
`auth-server` it clears `lastSentData` instead, on purpose, so the value is
re-broadcast. If the entity was also dirty locally, the next update sends the
received value back, the renderer included, with a bumped timestamp.

## What to do

Assert on what was sent, not on whether anything was: decode the sent
messages and check that none carries the value that must not leak. See the
"preloaded state" case in `test/sdk/on-start.spec.ts`.
