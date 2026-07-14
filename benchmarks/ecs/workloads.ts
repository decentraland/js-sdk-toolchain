import { Engine, Schemas, Transport } from '../../packages/@dcl/ecs/src'
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

function crdtFlush(options: BenchmarkOptions): BenchmarkTask {
  let bytesSent = 0
  const transport: Transport = {
    async send(message) {
      bytesSent += Array.isArray(message)
        ? message.reduce((total, chunk) => total + chunk.byteLength, 0)
        : message.byteLength
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

export const benchmarks: BenchmarkDefinition[] = [
  {
    name: 'entity-create-with-component',
    description: 'Create entities and attach one map component',
    setup: entityCreation
  },
  {
    name: 'query-two-components-50-percent-match',
    description: 'Iterate a two-component query where half of the entities match',
    setup: twoComponentQuery
  },
  {
    name: 'component-get-mutable',
    description: 'Read and mutate one component on every entity',
    setup: mutableComponentUpdate
  },
  {
    name: 'crdt-flush-components',
    description: 'Serialize and send one dirty component for every entity',
    setup: crdtFlush
  }
]
