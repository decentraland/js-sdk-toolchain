
# Scene runtime (SDK7)
Nowadays, the scenes are run through a single JavaScript file and the `scene-runtime` is responsible for that can happen. It serves some essential context and the scene can abstract from its implementation.

In some steps, the scene-runtime:
1. Prepares the global context (in JavaScript this would be the `globalThis`, `self` and/or `global`)
2. Retrieves the scene-code and then evaluates with the global-context prepared.
3. Expects from the evaluation some functions exported: `onStart` and `onUpdate`
4. Determinates when it's ready to call first `onStart` and then a continuos `onUpdate`. 

## Global context where the scene is evaluated
```ts
/**
 * All ES2022 features and syntax specifications: https://github.com/tc39/ecma402
 */
 
/**
 * WebSocket: https://developer.mozilla.org/es/docs/Web/API/WebSocket
 */

/**
 * fetch: https://developer.mozilla.org/es/docs/Web/API/Fetch_API
 */

/** @public */
const exports = {}

/** @public */
const module = { exports: {} }

/** @public */
const console = {
    log: devtools.log.bind(devtools),
    info: devtools.log.bind(devtools),
    debug: devtools.log.bind(devtools),
    trace: devtools.log.bind(devtools),
    warning: devtools.error.bind(devtools),
    error: devtools.error.bind(devtools)
}

/** @internal */
const loadedModules: Record<string, Module> = {}

/** @public */
function require(moduleName: string) {
    if (moduleName in loadedModules) return loadedModules[moduleName]

    /**
     * @internal loadSceneModule must provide the module required or fail
     */
    const module = loadSceneModule(moduleName)

    loadedModules[moduleName] = module
    return module
}

/** @public */
function setImmediate(fn: () => Promise<void>) {
    // @internal scene-runtime must provide the logic for this
    // fn should be called at the end of the current event loop
}
```
This interface is explained in terms of what now is. The `scene-runtime` can be implemented, in C++, Rust, or whatever language that can support and run ES2022 code. Except `exports` and `require` the rest of the interface is very trivial:

## `exports` by the scene
In the current protocol, `exports` has to be filled by the scene code with two functions:
```ts
typeof exports = {
    onUpdate: (dt: number) => void
    onStart: () => void
}
```
This is really important at the time when the code is evaluated, in this case for [this scene-runtime](https://github.com/decentraland/scene-runtime) which is used in `play.decentraland.org` and SDK of Decentraland. `onStart` is the function called at the beginning of the scene, before the first `onUpdate` and after the `eval`. `onUpdate` is called every tick and the `dt` param is the seconds pass between the last `onUpdate` and now. 

## `require`
This method retrieves the module required and returns all the methods available in the module. The list of modules available now is:
 - `~system/EngineApi`
 - `~system/EnvironmentApi`
 - `~system/Runtime`
 - `~system/CommunicationsController`
 - `~system/EthereumController`
 - `~system/ParcelIdentity`
 - `~system/Players`
 - `~system/RestrictedActions`
 - `~system/SignedFetch`
 - `~system/UserActionModule`
 - `~system/UserIdentity`

# API Reference

## Module `~system/EngineApi`
This module has the core functionality to render and communicate with the renderer which is going to manage the inputs from the user and of course, draw a scene's representation.

The methods available there:
```ts
function sendBatch(body: ManyEntityAction): Promise<SendBatchResponse>;
function subscribe(body: SubscribeRequest): Promise<SubscribeResponse>;
function unsubscribe(body: UnsubscribeRequest): Promise<UnsubscribeResponse>;
function crdtSendToRenderer(body: CrdtSendToRendererRequest): Promise<CrdtSendToResponse>;
function crdtGetState(body: CrdtSendToRendererRequest): Promise<CrdtGetStateResponse>;
function crdtGetMessageFromRenderer(body: CrdtMessageFromRendererRequest): Promise<CrdtMessageFromRendererResponse>;
```

### `sendBatch: (body) => Promise<Response>` 
It's a function that is mainly used in the previous SDK version (SDK6), but for feature parity, we keep some functionality, like the event reports.

Example: `const response = sendBatch({ actions: [] })`

#### Body Request (params)
- `actions: EntityAction[]`: array of ECS (previous model of SDK = sdk6) actions and other utils methods. For SDK7 usage, MUST BE empty. Because of this, they won't be referenced here.

#### Response
- `events: EventData[]`: an array of events that were fired between the previous call and now.

The `EventData` can be `generalEvent`, `positionChanged` and `rotationChanged`:
- `generalEvent` properties:
    - `eventId: string`
    - `eventData: string` an JSON-object serialized to String
- `positionChanged` properties:
    - `position: { x: number, y: number, z: number }`
    - `cameraPosition: { x: number, y: number, z: number }`
    - `playerHeight: number`
- `cameraChanged` properties:
    - `rotation: { x: number, y: number, z: number }`
    - `quaternion: { x: number, y: number, z: number, w: number }`

Example for `positionChanged`:
```ts
const response = sendBatch({ actions: [] }) 
response = {
    events: [
        {
            type: EventType.PositionChanged,
            position: { x: 1, y: 1, z: 0 },
            cameraPosition: { x: 0.8, y: 1, z: 0 },
            playerHeight: 1.6
        }
    ]}
}
```

In the case of `GenericEvent`, the `eventId` identifies the type of event that has been fired, and it determines the `eventData` type. All of them are described in the [posix decentraland reference](https://github.com/decentraland/posix/blob/main/src/index.d.ts), inside of `IEvent` interface each key is the `eventId` and the value of the type of `eventData`.

Example for `generic`:
```ts
const response = sendBatch({ actions: [] }) 
response = {
    events: [
        {
            type: EventType.Generic,
            eventId: 'onEnterScene',
            eventData: '{"playerId":"0xe7bc8fce...."}'
        }
    ]}
}
```

It's important to notice this event will be received if the scene previously calls `subscribe(eventId)`, for example, `subscribe('onEnterScene')`.

### CRDT methods
All methods with `data` property in their response or request body refer to an array of bytes. Except for the response of `crdtGetState`, which also has the property `hasEntities: boolean` and which means the scene has previous data.

```ts
interface CrdtSendToRendererRequest {
    data: Uint8Array;
}
interface CrdtSendToResponse {
    /** list of CRDT messages coming back from the renderer */
    data: Uint8Array[];
}
interface CrdtGetStateRequest {
}
interface CrdtGetStateResponse {
    /** returns true if the returned state has scene-created entities */
    hasEntities: boolean;
    /** static entities data (root entity, camera, etc) and scene-created entities */
    data: Uint8Array[];
}
/** deprecated */
interface CrdtMessageFromRendererRequest {
}
/** deprecated */
interface CrdtMessageFromRendererResponse {
    data: Uint8Array[];
}


declare module "~system/EngineApi" {
    function crdtSendToRenderer(body: CrdtSendToRendererRequest): Promise<CrdtSendToResponse>;
    function crdtGetState(body: CrdtSendToRendererRequest): Promise<CrdtGetStateResponse>;
    function crdtGetMessageFromRenderer(body: CrdtMessageFromRendererRequest): Promise<CrdtMessageFromRendererResponse>;
}

``` 


The main method is `crdtSendToRenderer`, both request and response are an object with the `data` property.

These bytes are data serialized following the [CRDT protocol exposed in the ADR-117](https://adr.decentraland.org/adr/ADR-117). 

#### `data`
The data is a stream of packets, each packet with the next struct and in **big-endian**:
- `messageLength: uint32`: number of bytes including the header
- `messageType: uint32`: number of type of message
- `data: bytes[]`: array of bytes with `length=messageLength-8`

Packets can be skipped one by one offset `messageLength` in the stream position.
Example: 
```ts 
deserializedMessage = {
    messageLength: 12,
    messageType: 3,
    data: [0, 0, 1, 0]
}
serializedMessage = [0, 0, 0, 12, 0, 0, 0, 3, 0, 0, 1, 0]
```

The possible messages are described in the previously quoted ADR. One of the most typical is `PUT_COMPONENT` and it's important to describe because it contains the component data. The SDK7 has an ECS (Entity Component System) architecture, you can read more about [here](https://docs.decentraland.org/creator/development-guide/sdk7/data-oriented-programming/). 

#### `PUT_COMPONENT` message
The `PUT_COMPONENT` is the `messageType = 1` and its schema is (BigEndian):
- `entityId: uint32`
- `componentId: uint32`
- `lamportTimestamp: uint32`
- `componentDataLength: uint32`: number of type of component data bytes
- `componentData: bytes[]`: array of bytes (`length=componentDataLength`)

#### componentData
The component data at the protocol level is just an array of bytes. The definition of how is serialized and deserialized depends exclusively on `componentId`. Until now, we can describe four types of serialization:
- `Transform`: it's a flat struct serialized as is
- The other renderer component: uses protocol-buffer
- Custom component created by the `Schemas` in `js-sdk-toolchain`: it's almost a trivial flat implementation.
- Custom component created by the `ISchema` interface: here the data is fully defined by the user, having the possibility of using JSON, protocol-buffer, string, etc.

The first three are described in the [ADR-123](https://adr.decentraland.org/adr/ADR-123), and defined in the [`protocol` repo](https://github.com/decentraland/protocol/tree/main/proto/decentraland/sdk/components)


### Entities: definition, reserved, and special entities
The entity is a 32-bit unique identifier, and it could be treated like that. But this ID is compound by an `entityNumber` and an `entityVersion` for optimization purposes (this is better explained in the ADRs):
- `entityNumber`: 16-bit unsigned number, its range is from 0 to 65535 inclusive.
- `entityVersion`: same as entityNumber.
- `entityId = (entityVersion << 16) | entityNumber`

Here is the first limitation, we could have up to 65536 entities simultaneously. But the first 512 (from 0 to 511) entities are reserved by the renderer for special entities:
- ZERO - `entityNumber = 0` : point to the root entity
- ONE - `entityNumber = 1` : point to the player entity
- TWO - `entityNumber = 2` : point to the player camera entity

The root entity has the root `Transform`, if we have to represent the entities like a tree, this entity is the top-level node. Every entity which needs a parent transform resolution has the root entity as default.

The player and player camera entity have the Transform and they are updated each tick.
