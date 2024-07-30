import { IEngine, Transform as TransformEngine, GltfContainer as GltfContainerEngine, Entity } from '@dcl/ecs'
import { EditorComponentNames, EditorComponents } from '../components'
import { addChild as createAddChild } from './add-child'
import { removeEntity as createRemoveEntity } from './remove-entity'

export function setGround(engine: IEngine) {
  return function setGround(src: string) {
    const addChild = createAddChild(engine)
    const removeEntity = createRemoveEntity(engine)
    const Transform = engine.getComponent(TransformEngine.componentName) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfContainerEngine.componentName) as typeof GltfContainerEngine
    const Scene = engine.getComponent(EditorComponentNames.Scene) as EditorComponents['Scene']
    const Ground = engine.getComponent(EditorComponentNames.Ground) as EditorComponents['Ground']
    const Lock = engine.getComponent(EditorComponentNames.Lock) as EditorComponents['Lock']
    const Tile = engine.getComponent(EditorComponentNames.Tile) as EditorComponents['Tile']

    // remove previous ground if any
    for (const [previousGround] of engine.getEntitiesWith(Ground)) {
      removeEntity(previousGround)
    }
    const ground = addChild(engine.RootEntity, 'Ground')
    Ground.create(ground)
    Lock.create(ground, { value: true })

    // Add one ground tile per parcel
    const { base, parcels } = Scene.get(engine.RootEntity).layout
    let id = 0
    for (const parcel of parcels) {
      const { x, y } = parcel
      const offset = { x: x - base.x, y: y - base.y }
      const position = { x: offset.x * 16 + 8, y: 0, z: offset.y * 16 + 8 }
      const tile = addChild(ground, `Tile ${++id}`)
      Transform.createOrReplace(tile, { parent: ground, position })
      Lock.create(tile, { value: true })
      GltfContainer.create(tile, {
        src,
        visibleMeshesCollisionMask: 1,
        invisibleMeshesCollisionMask: 2
      })
      Tile.create(tile)
    }
  }
}

export default setGround
