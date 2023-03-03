import * as components from '@dcl/ecs/dist/cjs/components'
import { Schemas, IEngine, Engine } from '@dcl/ecs'
import { ByteBuffer, ReadWriteByteBuffer } from '@dcl/ecs/dist/cjs/serialization/ByteBuffer'

export function serializeEngine(engine: IEngine) {
  const messages: ByteBuffer = new ReadWriteByteBuffer()

  // TODO: add deleted entities messages
  // add component values
  for (const component of engine.componentsIter()) {
    component.dumpCrdtState(messages)
  }

  return messages.toBinary()
}

function createEditorComponents(engine: IEngine) {
  const Label = engine.defineComponent('inspector::Label', {
    label: Schemas.String
  })

  const EntitySelected = engine.defineComponent('editor::EntitySelected', {
    gizmo: Schemas.Int
  })

  const Toggle = engine.defineComponent('inspector::Toggle', {})

  return { Label, EntitySelected, Toggle }
}

let engine: IEngine
// TODO: read scene from json file and dump it
export async function createFakeScene(): Promise<IEngine> {
  if (engine) return engine
  engine = Engine({
    onChangeFunction: function (entity, operation, component, value) {
      // TODO: undo-redo logic
    }
  })
  const Transform = components.Transform(engine as any)
  const MeshRenderer = components.MeshRenderer(engine as any)
  function spawnCubes() {
    const { Label } = createEditorComponents(engine)

    const parentA = engine.addEntity()
    Transform.create(parentA, {
      position: { x: 0, y: 0, z: 0 }
    })

    MeshRenderer.setBox(parentA)

    Label.create(parentA, { label: 'Parent A' })

    const parentB = engine.addEntity()

    Transform.create(parentB, {
      position: { x: 2, y: 0, z: 0 }
    })

    MeshRenderer.setBox(parentB)

    Label.create(parentB, { label: 'Parent B' })

    const child = engine.addEntity()

    Transform.create(child, {
      parent: parentA,
      position: { x: 1, y: 1, z: 1 }
    })

    MeshRenderer.setBox(child)

    Label.create(child, { label: 'Child' })
  }

  spawnCubes()
  await engine.update(1)
  return engine
}
