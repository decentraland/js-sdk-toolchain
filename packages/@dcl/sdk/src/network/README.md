
// enum Entities {
//   HOUSE = 1,
//   DOOR = 2
// }
// Syncronize Entities that are created on every client, inside the main function.
// Same entity for all clients.
// This is usefull when you have static entities that are created on every client, and you want to syncronized something about them.
// For example a door of a house. You want to every client create the same entity.
// We use the Entities enum to tag the entity with an unique identifier, so every client knows which entity you are modifying, no matter the order they are created
// This is used for code that is being executed on every client, and you want to sync some component about it. If you dont tag them, you can't be sure that both clients are talking about the same entity.
// Maybe for client A the door is the entity 512, but for client B its 513, and you will have some missmatch there.
// i.e.
// const houseEntity = engine.addEntity()
// syncEntity(houseEntity, [Transform.componentId], Entities.HOUSE)

// Syncronize RUNTIME/DYNAMIC entities
// When you want to create an entity after some condition, or interacion of the client, and want to replicate this new entity to all the clients.
// The client that runs this code will create an UNIQUE entity and will be replicated.
// For example bullets of a gun. Every client will have their own bullets, and every time they shot the gun
// a new entity (bullet) will be created and replicated on every client.
// Another example could be the spawn cubes. Every client that spawns a cube, will spawn an unique cube, and will be replicated on the others.
// All this examples have the same pattern, code that is being executed in only one client, and need to be sync/replicated on the other ones.
// function onShoot() {
//  const bullet = engine.addEntity()
//  Transform.create(bullet, {})
//  Material.create(bullet, {})
//  syncEntity(bullet, [Transform.componentId, Material.componentId])
// }
// If we dont use the SyncStaticEntities for static models like the house. Then each client will create a new House, and that House will be replicated
// on every client. So if you have 10 clients, you will have 10 houses being syncronized.
// That's why we use the SyncStaticEntities identifier for things that you want to be created only once, and can syncronized if some component changed.



// TODO: update state