import {
  Entity,
  IEngine,
  Transform as TransformEngine,
  GltfContainer as GltfEngine,
  PBGltfContainer,
  Vector3Type
} from '@dcl/ecs'
import { ComponentName, Trigger, TriggerType } from '@dcl/asset-packs'
import { CoreComponents } from '../components'
import updateSelectedEntity from './update-selected-entity'
import { addChild } from './add-child'

export function addAsset(engine: IEngine) {
  return function addAsset(
    parent: Entity,
    src: string,
    name: string,
    position: Vector3Type,
    components?: Partial<Record<CoreComponents | ComponentName, any>>
  ): Entity {
    const child = addChild(engine)(parent, name, components)
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfEngine.componentId) as typeof GltfEngine

    Transform.createOrReplace(child, { parent, position })

    let gltfContainerOptions: PBGltfContainer = { src }

    if (components) {
      const gltfComponent = components[CoreComponents.GLTF_CONTAINER]

      if (gltfComponent) {
        gltfContainerOptions = {
          ...(gltfComponent.src.includes('{assetPath}')
            ? { ...gltfContainerOptions, ...gltfComponent, src }
            : { ...gltfContainerOptions, ...gltfComponent })
        }
      }

      if (components[ComponentName.TRIGGERS]?.value.some((trigger: Trigger) => trigger.type === TriggerType.ON_CLICK)) {
        gltfContainerOptions.visibleMeshesCollisionMask ??= 1
        gltfContainerOptions.invisibleMeshesCollisionMask ??= 2
      }
    }

    console.log(gltfContainerOptions)

    GltfContainer.create(child, gltfContainerOptions)
    updateSelectedEntity(engine)(child)

    return child
  }
}

export default addAsset
