## Mapping syncronized Entities
How this works ?
We create a new component created NetworkEntity.
This network component consists in the id of the entity that was created in that client, and the networkId is the user address converted to a number. So its kind of the unique user id in a int64 format.

type NetwokEntity = { entityId: Entity; networkId: number }

We also introduce a new kind of messages that are going to be sent through the wire, and that the SDK knows how to read.
PutNetworkComponent message.
This message is the same as the PUT_COMPONENT BUT! with the difference that we are sending always the NetworkEntity mapping.
So this message will not have the local entityId, it will always send the NetworkEntity component associated to the entity.
PUT_NETWORK_MESSAGE = { networkId: networkEntity.networkId, entityId: networkEntity.entityId, data: Uint8Array }
So this way, every client has the internal mapping.
Once you receive a network message, you iterate the NetworkEntity component to find the one that has the same entityId and networkId. The entity with that component is the entity that the network is talking about.
When you change a component of that entity, we do the same. We look for the networkEntity and create a PutNetwork message with the NetworkEntity values.

## Syncronize Entities that are created in every client (Main Function)

enum Entities {
  HOUSE = 1,
  DOOR = 2
}
Same entity for all clients.

This is usefull when you have static entities that are created on every client, and you want to syncronize something about them.
For example a door of a house. You want every client to create the same door.
We use the Entities enum to tag the entity with an unique identifier, so every client knows which entity you are modifying, no matter the order they are created
This is used for code that is being executed on every client, and you want to sync some component about it. If you dont tag them, you can't be sure that both clients are talking about the same entity.
Maybe for client A the door is the entity 512, but for client B its 513, and you will have some missmatch there.
i.e.
const houseEntity = engine.addEntity()
syncEntity(houseEntity, [Transform.componentId], Entities.HOUSE)

If we dont use the SyncStaticEntities for static models like the house. Then each client will create a new House, and that House will be replicated on every client. So if you have 10 clients, you will have 10 houses being syncronized.
That's why we use the SyncStaticEntities identifier for things that you want to be created only once, and can syncronized if some component changed.


## Syncronize RUNTIME/DYNAMIC entities
This are entities that are created on a client after some interaction, and you want to replicate them on all the other clients.
The client that runs this code will create an UNIQUE entity and will be sent to the others.

For example bullets of a gun. Every client will have their own bullets, and every time they shot the gun a new entity (bullet) will be created and replicated on every client.
Another example could be the spawn cubes. Every client that spawns a cube, will spawn an unique cube, and will be replicated on the others.
All this examples have the same pattern, code that is being executed in only one client, and need to be syncronize on the other ones.

function onShoot() {
 const bullet = engine.addEntity()
 Transform.create(bullet, {})
 Material.create(bullet, {})
 syncEntity(bullet, [Transform.componentId, Material.componentId])
}

## Syncronizing Transform Issue
Let me tell you a sad story about syncronizing Transforms with different entities ids in each client
Scene wants to sync a door. (SyncEntities.Door & SyncEntities.ParentDoor).
We have clients A & B, and both creates the door in the main function.
Both clients knows that are the same door because we use the SyncEntities enum to map this entity.

A creates sync entity 512 (parent)
 const parent = engine.addEntity() // 512
 syncEntity(parent, [Transform.componentId], SyncEntities.ParentDoor)
A creates sync entity 513 (child)
 const child = engine.addEntity() // 513
 Transform.create({ parent, position: {} })
 syncEntity(child, [Transform.componentId], SyncEntities.ChildDoor)


Client B does the same but the entities, we dont know why, result in diff order. (Maybe a race condition)
B creates sync entity 513 (parent)
 const parent = engine.addEntity() // 513
 syncEntity(parent, [Transform.componentId], SyncEntities.ParentDoor)
B creates sync entity 514 (child)
 const child = engine.addEntity() // 514
 Transform.create({ parent, position: {} })
 syncEntity(child, [Transform.componentId], SyncEntities.ChildDoor)

So now client A has different raw data for the Transform with client B, because they have different parents.
Meaning that we have an inconsistent CRDT State between two clients.
So if there is a new message comming from client C we could have conflicts for client A but maybe not for client B.
I want to cry.

Solution 1:
 What if we introduce a new ParentSync.
 This ParentSync will be in charge of syncronizing the parenting. If we have ParentSync then we should always ignore the Transform.parent property.
 The parentSync will have both entityId and networkId such as the PutNetworkMessage so we can map the entity in every client.
 ParentSync.Schema = { parent: Entity; networkId: number }.
 Being the networkId the id of the user that owns that parent entity.
 const newParent: Entity = someEntityWeWantToUpdate() // 512
 this new parent returns the entity of this client, but it may not be the client who owns this entity.
 const networkParent = NetworkEntity.getOrNull(newParent) // { entityId: 1025, networkId: random }
 ParentSync.create(child, networkParent)

 Now imagine that client A want to create a new parent for a child that originally was created by Client B
 ```ts
 const parent = engine.addEntity()
 Transform.create(parent, { position: somePosition })
 syncEntity(parent, Transform.componentId)
 const childEntity: Entity = someEntityWeWantToUpdate()
 ParentSync.createOrReplace(childEntity, { parent, networkId: 'clientA' })
 ```
 This will generate two PUT_NETWORK_COMPONENT messages.
 One for the parent entity with the transform component ( networkId: clientA, entityId: parent )
 And another for the ParentSync of the child entity that was originally created by client B (networkId: clientB, entityId: child).
 Every client will know how to map this entity because the ParentSync has the pointers to the parent entity.
 ParentSync will point to the entity that was created on the first message.

 But we need to fix the parenting for the renderer, so it doesnt know about this logic
 So every time we send a Transform component to the renderer, we should update the transform.parent property with the mapped Entity that we fetch from the ParentSync.
 if (isTransform(message) && isRendererTransport && ParentSync.getOrNull(message.entityId)) {
   // Generate a new transform raw data with the parent property included
 }

 And every time we recieve a message from the renderer, we should remove the parent property to keep consistency in all CRDT state clients.
 if (isTransform(message) && message.type === CrdtMessageType.PUT_COMPONENT && ParentSync.has(message.entityId)) {
 transform.parent = null
   // Generate a new transform raw data without the parent property included
 }

 With this approach, all the clients will have the same Transform, so we avoid the inconsistency of crdt's state.
 And when some user wants to update the transform, it has to modify the ParentSync and will update both values, the parent & the network.
