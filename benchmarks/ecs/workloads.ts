import { components, Engine, getComponentEntityTree, Schemas, Transport } from '../../packages/@dcl/ecs/src'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { DeleteComponent, DeleteEntity, PutComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt'
import { BenchmarkDefinition, BenchmarkOptions, BenchmarkTask } from './types'

const TARGET_QUERY_VISITS = 1_000_000
const TARGET_MUTATIONS = 250_000
const TARGET_RECYCLING_OPERATIONS = 20_000
const TARGET_SERIALIZATION_ROUND_TRIPS = 50_000
const TARGET_HIERARCHY_VISITS = 100_000

function definePosition(engine: ReturnType<typeof Engine>) {
  return engine.defineComponent('benchmark::position', {
    x: Schemas.Float,
    y: Schemas.Float
  })
}

function defineVelocity(engine: ReturnType<typeof Engine>) {
  return engine.defineComponent('benchmark::velocity', {
    x: Schemas.Float,
    y: Schemas.Float
  })
}

function defineHealth(engine: ReturnType<typeof Engine>) {
  return engine.defineComponent('benchmark::health', {
    value: Schemas.Int
  })
}

function populatePositions(options: BenchmarkOptions) {
  const engine = Engine()
  const Position = definePosition(engine)
  const entities: Entity[] = []

  for (let index = 0; index < options.entityCount; index++) {
    const entity = engine.addEntity()
    entities.push(entity)
    Position.create(entity, { x: index % 101, y: index % 53 })
  }

  return { engine, Position, entities }
}

function entityCreation(options: BenchmarkOptions): BenchmarkTask {
  const engine = Engine()
  const Position = definePosition(engine)

  return {
    operations: options.entityCount,
    run() {
      let checksum = 0

      for (let index = 0; index < options.entityCount; index++) {
        const entity = engine.addEntity()
        Position.create(entity, { x: index % 101, y: index % 53 })
        checksum += entity
      }

      return checksum
    }
  }
}

function entityRemoval(options: BenchmarkOptions): BenchmarkTask {
  const { engine, entities } = populatePositions(options)

  return {
    operations: options.entityCount,
    run() {
      let checksum = 0

      for (const entity of entities) {
        engine.removeEntity(entity)
        checksum += entity
      }

      return checksum
    }
  }
}

function oneComponentQuery(options: BenchmarkOptions): BenchmarkTask {
  const { engine, Position } = populatePositions(options)
  const repetitions = Math.max(1, Math.ceil(TARGET_QUERY_VISITS / options.entityCount))

  return {
    operations: options.entityCount * repetitions,
    run() {
      let checksum = 0

      for (let iteration = 0; iteration < repetitions; iteration++) {
        for (const [entity, position] of engine.getEntitiesWith(Position)) {
          checksum += entity + position.x
        }
      }

      return checksum
    }
  }
}

function twoComponentQuery(options: BenchmarkOptions): BenchmarkTask {
  const { engine, Position, entities } = populatePositions(options)
  const Velocity = defineVelocity(engine)

  for (let index = 0; index < entities.length; index += 2) {
    Velocity.create(entities[index], { x: index % 17, y: index % 29 })
  }

  const repetitions = Math.max(1, Math.ceil(TARGET_QUERY_VISITS / options.entityCount))
  const matchingEntities = Math.ceil(options.entityCount / 2)

  return {
    operations: matchingEntities * repetitions,
    run() {
      let checksum = 0

      for (let iteration = 0; iteration < repetitions; iteration++) {
        for (const [entity, position, velocity] of engine.getEntitiesWith(Position, Velocity)) {
          checksum += entity + position.x + velocity.y
        }
      }

      return checksum
    }
  }
}

function threeComponentQuery(options: BenchmarkOptions): BenchmarkTask {
  const { engine, Position, entities } = populatePositions(options)
  const Velocity = defineVelocity(engine)
  const Health = defineHealth(engine)

  for (let index = 0; index < entities.length; index++) {
    if (index % 2 === 0) {
      Velocity.create(entities[index], { x: index % 17, y: index % 29 })
    }
    if (index % 10 === 0) {
      Health.create(entities[index], { value: index % 100 })
    }
  }

  const repetitions = Math.max(1, Math.ceil(TARGET_QUERY_VISITS / options.entityCount))
  const matchingEntities = Math.ceil(options.entityCount / 10)

  return {
    operations: matchingEntities * repetitions,
    run() {
      let checksum = 0

      for (let iteration = 0; iteration < repetitions; iteration++) {
        for (const [entity, position, velocity, health] of engine.getEntitiesWith(Position, Velocity, Health)) {
          checksum += entity + position.x + velocity.y + health.value
        }
      }

      return checksum
    }
  }
}

function mutableComponentUpdate(options: BenchmarkOptions): BenchmarkTask {
  const { Position, entities } = populatePositions(options)
  const repetitions = Math.max(1, Math.ceil(TARGET_MUTATIONS / options.entityCount))

  return {
    operations: options.entityCount * repetitions,
    run() {
      for (let iteration = 0; iteration < repetitions; iteration++) {
        for (const entity of entities) {
          Position.getMutable(entity).x += 1
        }
      }

      return Position.get(entities[entities.length - 1]).x
    }
  }
}

function componentChurn(options: BenchmarkOptions): BenchmarkTask {
  const { engine, Position, entities } = populatePositions(options)
  const Velocity = defineVelocity(engine)
  const repetitions = Math.max(2, Math.ceil(TARGET_MUTATIONS / options.entityCount))

  for (const entity of entities) {
    Velocity.create(entity, { x: entity % 17, y: entity % 29 })
  }

  return {
    operations: options.entityCount * repetitions,
    run() {
      let checksum = 0

      for (let iteration = 0; iteration < repetitions; iteration++) {
        for (const entity of entities) {
          if (Velocity.has(entity)) {
            Velocity.deleteFrom(entity)
          } else {
            Velocity.create(entity, { x: entity % 17, y: entity % 29 })
          }
        }

        for (const [entity, position] of engine.getEntitiesWith(Position, Velocity)) {
          checksum += entity + position.x
        }
      }

      return checksum
    }
  }
}

function entityRecycling(options: BenchmarkOptions): BenchmarkTask {
  const engine = Engine()
  const batchSize = Math.min(options.entityCount, 5_000)
  const cycles = Math.max(2, Math.ceil(TARGET_RECYCLING_OPERATIONS / (batchSize * 2)))

  return {
    operations: batchSize * cycles * 2,
    async run() {
      let checksum = 0

      for (let cycle = 0; cycle < cycles; cycle++) {
        const entities: Entity[] = []
        for (let index = 0; index < batchSize; index++) {
          const entity = engine.addEntity()
          entities.push(entity)
          checksum += entity
        }
        for (const entity of entities) {
          engine.removeEntity(entity)
        }
        await engine.update(1 / 60)
      }

      return checksum
    }
  }
}

function hierarchyRemoval(options: BenchmarkOptions): BenchmarkTask {
  const engine = Engine()
  const Transform = components.Transform(engine)
  const root = engine.addEntity()
  Transform.create(root)

  for (let index = 1; index < options.entityCount; index++) {
    const entity = engine.addEntity()
    Transform.create(entity, { parent: root })
  }

  return {
    operations: options.entityCount,
    run() {
      engine.removeEntityWithChildren(root)
      return root
    }
  }
}

function createDeepHierarchy(options: BenchmarkOptions) {
  const engine = Engine()
  const Transform = components.Transform(engine)
  const depth = Math.min(options.entityCount, 500)
  let parent = engine.addEntity()
  Transform.create(parent, { position: { x: 1, y: 1, z: 1 } })
  const root = parent

  for (let index = 1; index < depth; index++) {
    const entity = engine.addEntity()
    Transform.create(entity, {
      parent,
      position: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    })
    parent = entity
  }

  return { depth, engine, root }
}

function deepHierarchyTraversal(options: BenchmarkOptions): BenchmarkTask {
  const { depth, engine, root } = createDeepHierarchy(options)
  const Transform = components.Transform(engine)
  const repetitions = Math.max(1, Math.ceil(TARGET_HIERARCHY_VISITS / depth / 10))

  return {
    operations: depth * repetitions,
    run() {
      let checksum = 0
      for (let index = 0; index < repetitions; index++) {
        for (const entity of getComponentEntityTree(engine, root, Transform)) {
          checksum += entity
        }
      }
      return checksum
    }
  }
}

function deepHierarchyRemoval(options: BenchmarkOptions): BenchmarkTask {
  const { depth, engine, root } = createDeepHierarchy(options)

  return {
    operations: depth,
    run() {
      engine.removeEntityWithChildren(root)
      return root
    }
  }
}

function countMessageBytes(message: Uint8Array | Uint8Array[]): number {
  return Array.isArray(message) ? message.reduce((total, chunk) => total + chunk.byteLength, 0) : message.byteLength
}

function crdtFlush(options: BenchmarkOptions): BenchmarkTask {
  let bytesSent = 0
  const transport: Transport = {
    async send(message) {
      bytesSent += countMessageBytes(message)
    },
    filter() {
      return true
    }
  }
  const engine = Engine()
  engine.addTransport(transport)
  const Position = definePosition(engine)

  for (let index = 0; index < options.entityCount; index++) {
    const entity = engine.addEntity()
    Position.create(entity, { x: index % 101, y: index % 53 })
  }

  return {
    operations: options.entityCount,
    async run() {
      await engine.update(1 / 60)
      return bytesSent
    }
  }
}

async function unchangedMutableCrdtFlush(options: BenchmarkOptions): Promise<BenchmarkTask> {
  let bytesSent = 0
  const { engine, Position, entities } = populatePositions(options)
  engine.addTransport({
    async send(message) {
      bytesSent += countMessageBytes(message)
    },
    filter() {
      return true
    }
  })

  await engine.update(1 / 60)
  bytesSent = 0

  return {
    operations: options.entityCount,
    async run() {
      let checksum = 0
      for (const entity of entities) {
        checksum += Position.getMutable(entity).x
      }

      await engine.update(1 / 60)
      return checksum + bytesSent
    }
  }
}

function crdtFlushMultipleTransports(options: BenchmarkOptions): BenchmarkTask {
  let bytesSent = 0
  const engine = Engine()

  for (let index = 0; index < 4; index++) {
    engine.addTransport({
      async send(message) {
        bytesSent += countMessageBytes(message)
      },
      filter() {
        return true
      }
    })
  }

  const Position = definePosition(engine)
  for (let index = 0; index < options.entityCount; index++) {
    const entity = engine.addEntity()
    Position.create(entity, { x: index % 101, y: index % 53 })
  }

  return {
    operations: options.entityCount * 4,
    async run() {
      await engine.update(1 / 60)
      return bytesSent
    }
  }
}

function crdtFlushMixedTransportFilters(options: BenchmarkOptions): BenchmarkTask {
  let bytesSent = 0
  const engine = Engine()
  const Position = definePosition(engine)
  const Velocity = defineVelocity(engine)
  const acceptedComponentIds = [
    new Set([Position.componentId]),
    new Set([Velocity.componentId]),
    new Set([Position.componentId, Velocity.componentId]),
    new Set<number>()
  ]

  for (const acceptedIds of acceptedComponentIds) {
    engine.addTransport({
      async send(message) {
        bytesSent += countMessageBytes(message)
      },
      filter(message) {
        return (
          'componentId' in message && typeof message.componentId === 'number' && acceptedIds.has(message.componentId)
        )
      }
    })
  }

  for (let index = 0; index < options.entityCount; index++) {
    const entity = engine.addEntity()
    Position.create(entity, { x: index % 101, y: index % 53 })
    if (index % 2 === 0) {
      Velocity.create(entity, { x: index % 17, y: index % 29 })
    }
  }

  return {
    operations: options.entityCount * 3,
    async run() {
      await engine.update(1 / 60)
      return bytesSent
    }
  }
}

function createIncomingTransport(): Transport {
  return {
    async send() {},
    filter() {
      return true
    }
  }
}

function writePositionMessage(
  Position: ReturnType<typeof definePosition>,
  entity: Entity,
  timestamp: number,
  index: number,
  target: ReadWriteByteBuffer
): void {
  const data = new ReadWriteByteBuffer()
  Position.schema.serialize({ x: index % 101, y: index % 53 }, data)
  PutComponentOperation.write(entity, timestamp, Position.componentId, data.toBinary(), target)
}

function incomingCrdtUpdates(options: BenchmarkOptions): BenchmarkTask {
  const engine = Engine()
  const Position = definePosition(engine)
  const transport = createIncomingTransport()
  engine.addTransport(transport)
  const messages = new ReadWriteByteBuffer()
  let lastEntity = 0 as Entity

  for (let index = 0; index < options.entityCount; index++) {
    lastEntity = engine.addEntity()
    writePositionMessage(Position, lastEntity, 1, index, messages)
  }

  return {
    operations: options.entityCount,
    async run() {
      transport.onmessage!(messages.toBinary())
      await engine.update(1 / 60)
      return Position.get(lastEntity).x
    }
  }
}

async function incomingMixedCrdtMessages(options: BenchmarkOptions): Promise<BenchmarkTask> {
  const { engine, Position, entities } = populatePositions(options)
  const transport = createIncomingTransport()
  engine.addTransport(transport)
  await engine.update(1 / 60)
  const messages = new ReadWriteByteBuffer()

  for (let index = 0; index < entities.length; index++) {
    const entity = entities[index]
    if (index % 10 === 8) {
      DeleteComponent.write(entity, Position.componentId, 2, messages)
    } else if (index % 10 === 9) {
      DeleteEntity.write(entity, messages)
    } else {
      writePositionMessage(Position, entity, 2, index + 1, messages)
    }
  }

  return {
    operations: options.entityCount,
    async run() {
      transport.onmessage!(messages.toBinary())
      await engine.update(1 / 60)
      let checksum = 0
      for (const [entity, position] of engine.getEntitiesWith(Position)) {
        checksum += entity + position.x
      }
      return checksum
    }
  }
}

async function representativeFrame(options: BenchmarkOptions): Promise<BenchmarkTask> {
  let bytesSent = 0
  const { engine, Position, entities } = populatePositions(options)
  const Velocity = defineVelocity(engine)

  for (let index = 0; index < entities.length; index += 2) {
    Velocity.create(entities[index], { x: 1, y: 1 })
  }

  engine.addTransport({
    async send(message) {
      bytesSent += countMessageBytes(message)
    },
    filter() {
      return true
    }
  })
  await engine.update(1 / 60)
  bytesSent = 0
  let checksum = 0

  engine.addSystem(() => {
    for (const [entity, position, velocity] of engine.getEntitiesWith(Position, Velocity)) {
      Position.getMutable(entity).x = position.x + velocity.x
    }
  })
  engine.addSystem(() => {
    checksum = 0
    for (const [entity, position] of engine.getEntitiesWith(Position)) {
      checksum += entity + position.x
    }
  })

  const frames = 5
  return {
    operations: options.entityCount * frames * 1.5,
    async run() {
      for (let frame = 0; frame < frames; frame++) {
        await engine.update(1 / 60)
      }
      return checksum + bytesSent
    }
  }
}

function smallMapSerialization(): BenchmarkTask {
  const schema = Schemas.Map({ x: Schemas.Float, y: Schemas.Float })
  const value = { x: 12.5, y: 42.25 }

  return {
    operations: TARGET_SERIALIZATION_ROUND_TRIPS,
    run() {
      let checksum = 0
      for (let index = 0; index < TARGET_SERIALIZATION_ROUND_TRIPS; index++) {
        const buffer = new ReadWriteByteBuffer()
        schema.serialize(value, buffer)
        const decoded = schema.deserialize(new ReadWriteByteBuffer(buffer.toBinary()))
        checksum += decoded.x + decoded.y
      }
      return checksum
    }
  }
}

function nestedMapSerialization(): BenchmarkTask {
  const schema = Schemas.Map({
    id: Schemas.Int,
    label: Schemas.String,
    transform: Schemas.Map({
      position: Schemas.Vector3,
      weights: Schemas.Array(Schemas.Float)
    })
  })
  const value = {
    id: 42,
    label: 'benchmark-entity',
    transform: {
      position: { x: 1, y: 2, z: 3 },
      weights: [0.1, 0.2, 0.3, 0.4]
    }
  }

  return {
    operations: TARGET_SERIALIZATION_ROUND_TRIPS,
    run() {
      let checksum = 0
      for (let index = 0; index < TARGET_SERIALIZATION_ROUND_TRIPS; index++) {
        const buffer = new ReadWriteByteBuffer()
        schema.serialize(value, buffer)
        const decoded = schema.deserialize(new ReadWriteByteBuffer(buffer.toBinary()))
        checksum += decoded.id + decoded.transform.weights.length
      }
      return checksum
    }
  }
}

function protobufComponentSerialization(): BenchmarkTask {
  const engine = Engine()
  const GltfContainer = components.GltfContainer(engine)
  const entity = engine.addEntity()
  GltfContainer.create(entity, {
    src: 'models/benchmark.glb',
    visibleMeshesCollisionMask: 3,
    invisibleMeshesCollisionMask: 4
  })
  const value = GltfContainer.get(entity)

  return {
    operations: TARGET_SERIALIZATION_ROUND_TRIPS,
    run() {
      let checksum = 0
      for (let index = 0; index < TARGET_SERIALIZATION_ROUND_TRIPS; index++) {
        const buffer = new ReadWriteByteBuffer()
        GltfContainer.schema.serialize(value, buffer)
        const decoded = GltfContainer.schema.deserialize(new ReadWriteByteBuffer(buffer.toBinary()))
        checksum += decoded.src.length
      }
      return checksum
    }
  }
}

function growOnlyValueSetAppend(options: BenchmarkOptions): BenchmarkTask {
  const engine = Engine()
  const Event = engine.defineValueSetComponentFromSchema(
    'benchmark::event',
    Schemas.Map({ timestamp: Schemas.Int, value: Schemas.Int }),
    {
      timestampFunction: (value) => value.timestamp,
      maxElements: 100
    }
  )
  const entity = engine.addEntity()

  return {
    operations: options.entityCount,
    run() {
      for (let index = 0; index < options.entityCount; index++) {
        Event.addValue(entity, { timestamp: 1, value: index })
      }
      return Event.get(entity).size
    }
  }
}

export const benchmarks: BenchmarkDefinition[] = [
  {
    name: 'entity-create-with-component',
    description: 'Create entities and attach one map component',
    setup: entityCreation
  },
  {
    name: 'entity-remove-with-component',
    description: 'Remove entities that each have one map component',
    setup: entityRemoval
  },
  {
    name: 'query-one-component-100-percent-match',
    description: 'Iterate a one-component query where every entity matches',
    setup: oneComponentQuery
  },
  {
    name: 'query-two-components-50-percent-match',
    description: 'Iterate a two-component query where half of the entities match',
    setup: twoComponentQuery
  },
  {
    name: 'query-three-components-10-percent-match',
    description: 'Iterate a three-component query where one tenth of the entities match',
    setup: threeComponentQuery
  },
  {
    name: 'component-get-mutable',
    description: 'Read and mutate one component on every entity',
    setup: mutableComponentUpdate
  },
  {
    name: 'component-churn-and-query',
    description: 'Repeatedly add and remove a query component, then iterate matches',
    setup: componentChurn
  },
  {
    name: 'entity-recycling',
    description: 'Create, remove, release, and reuse batches of entity identifiers',
    setup: entityRecycling
  },
  {
    name: 'remove-wide-entity-hierarchy',
    description: 'Remove a root entity and all of its direct children',
    setup: hierarchyRemoval
  },
  {
    name: 'traverse-deep-component-hierarchy',
    description: 'Traverse a component parent chain up to 500 levels deep',
    setup: deepHierarchyTraversal
  },
  {
    name: 'remove-deep-entity-hierarchy',
    description: 'Remove a chain of up to 500 parented entities',
    setup: deepHierarchyRemoval
  },
  {
    name: 'crdt-flush-components',
    description: 'Serialize and send one dirty component for every entity',
    setup: crdtFlush
  },
  {
    name: 'crdt-flush-unchanged-mutables',
    description: 'Suppress unchanged mutable component reads during a CRDT flush',
    setup: unchangedMutableCrdtFlush
  },
  {
    name: 'crdt-flush-four-transports',
    description: 'Route and send dirty components through four accepting transports',
    setup: crdtFlushMultipleTransports
  },
  {
    name: 'crdt-flush-mixed-transport-filters',
    description: 'Route two component types through selective and rejecting transports',
    setup: crdtFlushMixedTransportFilters
  },
  {
    name: 'crdt-receive-component-updates',
    description: 'Parse and apply incoming component update messages',
    setup: incomingCrdtUpdates
  },
  {
    name: 'crdt-receive-mixed-messages',
    description: 'Apply incoming component updates, component deletes, and entity deletes',
    setup: incomingMixedCrdtMessages
  },
  {
    name: 'representative-ecs-frame',
    description: 'Run overlapping query systems, mutations, and CRDT flushes for five frames',
    setup: representativeFrame
  },
  {
    name: 'serialize-small-map',
    description: 'Round-trip a two-number map schema',
    setup: smallMapSerialization
  },
  {
    name: 'serialize-nested-map-and-array',
    description: 'Round-trip nested maps, vectors, strings, and arrays',
    setup: nestedMapSerialization
  },
  {
    name: 'serialize-protobuf-component',
    description: 'Round-trip a generated GltfContainer component schema',
    setup: protobufComponentSerialization
  },
  {
    name: 'grow-only-value-set-append',
    description: 'Append same-timestamp events to a bounded grow-only value set',
    setup: growOnlyValueSetAppend
  }
]
