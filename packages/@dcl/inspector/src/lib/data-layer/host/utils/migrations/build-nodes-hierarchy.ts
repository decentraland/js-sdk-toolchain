import { IEngine, Entity, Transform, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'

import { EditorComponentNames, EditorComponentsTypes, Node } from '../../../../sdk/components'
import { cleanPush } from '../../../../utils/array'

/**
 * Build Node component hierarchy from current engine status
 * @param engine engine to build upon
 */
export function buildNodesHierarchy(engine: IEngine): Node[] {
  const hierarchy = new Map<Entity, Node>([
    [engine.RootEntity, { entity: engine.RootEntity, open: true, children: [] }]
  ])

  // Set all engine's entities in hierarchy (entities without component are unretrievable)
  for (const component of engine.componentsIter()) {
    for (const [entity] of engine.getEntitiesWith(component)) {
      hierarchy.set(entity, { entity, children: [] })
    }
  }

  // Update children for nodes in the hierarchy based on Transform's parent value.
  // If there is no parent value, push it to RootEntity children
  for (const [entity] of hierarchy) {
    if (entity === engine.RootEntity) continue
    const parent = Transform.getOrNull(entity)?.parent
    if (parent) {
      const children = hierarchy.get(parent)?.children || []
      hierarchy.set(parent, { entity: parent, children: cleanPush(children, entity) })
    } else {
      const children = hierarchy.get(engine.RootEntity)!.children
      hierarchy.set(engine.RootEntity, { entity: engine.RootEntity, open: true, children: cleanPush(children, entity) })
    }
  }

  hierarchy.set(engine.PlayerEntity, { entity: engine.PlayerEntity, children: [] })
  hierarchy.set(engine.CameraEntity, { entity: engine.CameraEntity, children: [] })

  const root = hierarchy.get(engine.RootEntity)!
  hierarchy.set(engine.RootEntity, { ...root, open: true })

  return Array.from(hierarchy.values())
}

/**
 * Build & set Node component value only if the component doesn't have previous value
 * @param engine engine to build upon
 */
export function buildNodesHierarchyIfNotExists(engine: IEngine) {
  const Nodes = engine.getComponentOrNull(EditorComponentNames.Nodes) as LastWriteWinElementSetComponentDefinition<
    EditorComponentsTypes['Nodes']
  > | null

  if (Nodes) {
    const value = Nodes.getOrNull(engine.RootEntity)?.value || []
    if (value.length) return

    function hierarchySystem() {
      engine.removeSystem(hierarchySystem)
      Nodes!.createOrReplace(engine.RootEntity, { value: buildNodesHierarchy(engine) })
    }

    engine.addSystem(hierarchySystem)
  }
}
