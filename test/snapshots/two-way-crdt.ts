import { engine, Transform } from '@dcl/sdk/ecs'
import * as components from '@dcl/ecs/dist/components'
import { withRenderer } from 'helpers/with-renderer'
import { assert } from 'helpers/assertions'
export * from '@dcl/sdk'

withRenderer((engine) => {
  // this helper creates a second engine and prints all the messages to emulate
  // the renderer counterpart of the CRDT
  const Transform = components.Transform(engine)
  Transform.create(engine.RootEntity, { scale: { x: 9, y: 9, z: 9 } })

  engine.addSystem(() => {
    Transform.getMutable(engine.RootEntity).position.x += 1
  })
})

engine.addSystem((deltaTime) => {
  if (deltaTime === 0.0) {
    assert(Transform.has(engine.RootEntity), 'RootEntity has a transform')
    assert(Transform.getOrNull(engine.RootEntity)?.scale.x === 9, 'RootEntity has the correct scale')
  }
})
