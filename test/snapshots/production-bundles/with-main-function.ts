import { engine, GltfContainer, MeshRenderer, Transform } from '@dcl/sdk/ecs'

export function main() {
  const cube = engine.addEntity()
  Transform.create(cube)
  MeshRenderer.setBox(cube)

  engine.addSystem(() => {
    const newEntity = engine.addEntity()
    GltfContainer.create(newEntity, { src: 'test.glb' })
  })
}
