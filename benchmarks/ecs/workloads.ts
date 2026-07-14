import { components, Engine, Schemas, Transport } from '../../packages/@dcl/ecs/src'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { BenchmarkDefinition, BenchmarkOptions, BenchmarkTask } from './types'

const TARGET_QUERY_VISITS = 1_000_000
const TARGET_MUTATIONS = 250_000

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
    name: 'remove-wide-entity-hierarchy',
    description: 'Remove a root entity and all of its direct children',
    setup: hierarchyRemoval
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
  }
]
