# Tests that inject CRDT messages must pass auth-server's reserved-entity guard

The `auth-server` branch has a receive-side guard that `main` doesn't have yet
(#1553). If you write a test on `main` that feeds renderer events into the
engine, it can pass on `main` and still hang on the auth-server sync.

## How the guard works

On `auth-server`, `receiveMessages` in
`packages/@dcl/ecs/src/systems/crdt/index.ts` drops component writes (PUT,
DELETE, APPEND, and AUTHORITATIVE_PUT) to reserved entities, `RootEntity`
included, when they arrive from a transport without `allowReservedEntities`.
Only the renderer transport sets that flag.

A test transport built as `{ send, filter }` counts as untrusted. Every event
it injects on `RootEntity` is dropped silently, so anything awaiting those
events times out.

## What to do

Give a test transport that stands in for the renderer the flag, and cast it,
because `main`'s `Transport` type doesn't declare the field yet:

```ts
transport = { send: async () => {}, filter: () => true, allowReservedEntities: true } as Transport
```

On `main` the field has no effect. On `auth-server` it makes the transport
trusted. See `test/sdk/explorer-ui/openExplorerUiAndWait.spec.ts` for an
example.

## How it surfaces

The "Sync main to auth-server" workflow runs the full suite on the merged tree.
A test that only fails there shows up as Jest timeouts in that workflow while
`main`'s own CI stays green.
