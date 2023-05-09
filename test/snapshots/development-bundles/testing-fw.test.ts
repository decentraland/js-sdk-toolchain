import { engine, Transform } from '@dcl/sdk/ecs'
import { test } from '@dcl/sdk/src/testing'
import * as components from '@dcl/ecs/dist/components'
import { withRenderer } from '../helpers/with-renderer'
import { assert } from '../helpers/assertions'
export * from '@dcl/sdk'

export const onServerUpdate = withRenderer((engine) => {
  // this helper creates a second engine and prints all the messages to emulate
  // the renderer counterpart of the CRDT
  const Transform = components.Transform(engine)
  Transform.create(engine.RootEntity, { scale: { x: 9, y: 9, z: 9 } })

  engine.addSystem(() => {
    const mut = Transform.getMutableOrNull(engine.RootEntity)
    if (mut) {
      console.log(`Adding one to position.y=${mut.position.y}`)
      mut.position.x = mut.position.y + 1
    }
  })
})

const newEntity = engine.addEntity()

test('two way communication', function* () {
  assert(Transform.has(engine.RootEntity), 'RootEntity has a transform')
  assert(Transform.getOrNull(engine.RootEntity)?.scale.x === 9, 'RootEntity has the correct scale')
  Transform.getMutableOrNull(engine.RootEntity)!.position.y += 1
  Transform.create(newEntity)

  yield

  Transform.getMutable(newEntity)!.position.y = 1
  engine.removeEntity(newEntity)
  Transform.deleteFrom(engine.RootEntity)

  yield

  Transform.create(engine.RootEntity)

  yield

  assert(Transform.getOrNull(engine.RootEntity)?.position.x === 1, 'RootEntity has the correct position')
  assert(Transform.getOrNull(engine.RootEntity)?.scale.x === 1, 'RootEntity has the correct scale')
})
