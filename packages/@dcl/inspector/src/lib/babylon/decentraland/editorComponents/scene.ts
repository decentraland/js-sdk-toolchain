import { ComponentType, getComponentEntityTree } from '@dcl/ecs'
import type { ComponentOperation } from '../component-operations'
import { Layout } from '../../../utils/layout'
import { getLayoutManager } from '../layout-manager'

export const putSceneComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const value = component.getOrNull(entity.entityId) as { layout: Layout } | null
    if (!value) return

    const context = entity.context.deref()!

    // set layout
    const lm = getLayoutManager(context.scene)
    const didChange = lm.setLayout(value.layout)

    // if the layout changed, we might need to update the grounds
    if (didChange) {
      // find the ground entity
      const result = Array.from(context.engine.getEntitiesWith(context.editorComponents.Ground))[0]
      if (result) {
        const [ground] = result

        // find all the tiles
        const tree = getComponentEntityTree(context.engine, ground, context.Transform)

        // find all the models used by the tiles
        const paths: string[] = []
        for (const tile of tree) {
          const gltf = context.GltfContainer.getOrNull(tile)
          if (gltf) {
            paths.push(gltf.src)
          }
        }

        // pick the most common one as the ground
        const pathCounts = new Map<string, number>()
        for (const path of paths) {
          pathCounts.set(path, (pathCounts.get(path) || 0) + 1)
        }

        let mostCommonPath = ''
        let maxCount = 0
        for (const [path, count] of pathCounts.entries()) {
          if (count > maxCount) {
            maxCount = count
            mostCommonPath = path
          }
        }

        const path = mostCommonPath

        // update the layout using this path
        if (path) {
          context.operations.setGround(path)
          void context.operations.dispatch()
        }
      }
    }
  }
}
