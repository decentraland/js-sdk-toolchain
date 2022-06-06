# ECS 7

## Installing dependencies
Run `make install`, this will run the `npm install` and other dependencies

## Building
Run `make build`

## Testing
Run `make test`, you can also debug the test in VS code, selecting the launch `Jest current file` or just `Jest` (this will run all test)

## Wishlist 
Use this project as template for TypeScript libraries
- [x] as any MutableGroupOf
- [x] Tests for system
- [ ] use @dcl/ecs-math https://github.com/decentraland/ecs-math
- [ ] Basic Components ( Transform ) w/Tests
- [ ] Sync Component W/Tests
- [x] CRDT System
- [ ] Kindof Scene Tests. Component & Systems. Maybe physics system? SolarSystem
- [ ] Integration with old ecs ( CRDT/Door Scene )
- [ ] RPC Transport. JSON { entityId, componentId, data: } vs Protocol Buffers
- [ ] EntityID generator
- [ ] Static vs Dynamic entities.
- [ ] Sync Components ?
- [ ] Where the state lives ? State cross realms/islands ? StateFull questions. StorableComponent ?