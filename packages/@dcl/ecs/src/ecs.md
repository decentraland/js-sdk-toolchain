```ts
/**
 * This is te first approach we discuss with @mendez
 * Keeping here just for document purpose
 */

import { Entity } from './entity'
type Handler<T = any> = (value: string, name: string, previousValue?: T) => T

interface Spec {
  [key: string]: string | Handler | [Handler]
}

type Result<T extends Spec> = {
  [K in keyof T]: T[K] extends Handler ? ReturnType<T[K]> : T[K] extends [Handler] ? Array<ReturnType<T[K][0]>> : never
}


type ComponentDefinition<T extends Spec> = {
  /** @deprecated */
  new(): {}
  removeFrom(entity: Entity): void
  getFrom(entity: Entity): DeepReadonly<Result<T>>

  getOrNull(entity: Entity): DeepReadonly<Result<T>> | null

  // adds this component to the list "to be reviewed next frame"
  put(entity: Entity, val: Result<T>): Result<T>

  // adds this component to the list "to be reviewed next frame"
  mutable(entity: Entity): Result<T>

  updateFromBinary(entity: Entity, data: Uint8Array): void
  toBinary(entity: Entity): Uint8Array

  iterator(): Iterable<[Entity, Result<T>]>
  dirtyIterator(): Iterable<Entity>
}


function getComponentDefinition(componentNumber: number): ComponentDefinition<any> | undefined {
  throw 1
}
function defineComponent<T extends Spec>(
  componentId: number,
  shape: T
  // serializers, etc
): ComponentDefinition<T> {
  const map = new Map<Entity, Result<T>>()

  throw 1
}
function getComponentsDefinition(): Array<{componentId: number, definition: ComponentDefinition<any> }> {
  return []
}

function mutableGroupOf<T1 extends ComponentDefinition<any>>(componentDefnition: T1): Iterable<[Entity, ReturnType<T1['mutable']>]>
function mutableGroupOf<T1 extends ComponentDefinition<any>, T2 extends ComponentDefinition<any>>(componentDefnition: T1, componentDefnition2: T2): Iterable<[Entity, ReturnType<T1['mutable']>, ReturnType<T2['mutable']>]>
function mutableGroupOf(...args:any): Iterable<Array<any>> {
  throw 1
}

type Selector<T> = (entity: Entity) => T | undefined
function each<T1>(componentDefnition: Selector<T1>): Iterable<[Entity, T1]>
function each<T1, T2>(componentDefnition: Selector<T1>, componentDefnition2: Selector<T2>): Iterable<[Entity, T1, T2]>
function each(...args:any): Iterable<Array<any>> {


  throw 1
}

function addSystem(fn: (deltaTime: number) => void) {}

const engine = {
  getComponentDefinition,
  defineComponent,
  getComponentsDefinition,
  mutableGroupOf,
  each,
  addSystem
}

// A
const Position = engine.defineComponent(555, { x: Number })
const Velocity = engine.defineComponent(556, { x: Number, y: Number })

const component = Position.put(Entity(), { x: 1 })
const components = engine.mutableGroupOf(Position)
const entity = Entity()

Position.removeFrom(entity)

// invalid
Position.getFrom(entity).x = 1

// valid
Position.mutable(entity).x = 1
Position.put(entity, { x: 1 })


engine.addSystem(function physics(deltaTime) {
  // O(N=Position.count)
  for (const [entity, position] of Position.iterator()) {
    const velocity = Velocity.mutable(entity)
    if(velocity) {
      position.x = position.x + velocity.x * deltaTime
    }
  }
})


// system
engine.addSystem(function physics(deltaTime) {
  // O(N=Position.count)
  for (const [_entity, position, velocity] of engine.mutableGroupOf(Position, Velocity)) {
    position.x = position.x + velocity.x * deltaTime
  }
})

// system
engine.addSystem(function physics(deltaTime) {
  // O(N=Position.count)
  for (const [entity, position] of engine.mutableGroupOf(Position)) {
    const velocity = Velocity.getOrNull(entity)
    if (velocity) {
      position.x = position.x + velocity.x * deltaTime
    }
  }
})

// system DISCARDED
for (const [_entity, position, velocity] of engine.each(Position.mutable, Velocity.getFrom)) {
  position.x = position.x + velocity.x * deltaTime
}

// CRDT
function receiveNewComponentData(entityId, componentId, data) {
  const TheComponentDefinition = engine.getComponentDefinition(componentId)
  if (TheComponentDefinition) {
    TheComponentDefinition.updateFromBinary(entityId, data)
  }
}

function sendChangesToRenderer() {
  const components = engine.getComponentsDefinition()
  for (const componentDefinition of components) {
    for (const entity of componentDefinition.definition.dirtyIterator()) {
      const serialized = componentDefinition.definition.toBinary(entity)
      // sendToRenderer(serialized)
    }
  }
}
```