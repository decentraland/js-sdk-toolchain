import { Entity, getComponentEntityTree } from '@dcl/ecs'
import { useCallback, useState } from 'react'
import { getEmptyTree, getTreeFromEngine, ROOT } from '../../lib/sdk/tree'
import { useChange } from './useChange'
import { useSdk } from './useSdk'
import { changeSelectedEntity } from '../../lib/utils/gizmo'
import { isLastWriteWinComponent } from './useComponentValue'

/**
 * Used to get a tree and the functions to work with it
 * @returns
 */
export const useTree = () => {
  const sdk = useSdk()

  // Generate a tree if the sdk is available, or an empty tree otherwise
  const getTree = useCallback(() => {
    if (sdk) {
      const {
        engine,
        components: { EntityNode }
      } = sdk
      return getTreeFromEngine(engine, EntityNode)
    } else {
      return getEmptyTree()
    }
  }, [sdk])

  const [tree, setTree] = useState(getTree())

  // Update tree when a change happens in the engine
  const handleUpdate = useCallback(() => setTree(getTree()), [setTree, getTree])
  useChange(handleUpdate)

  const getId = useCallback((entity: Entity) => entity.toString(), [])

  const getChildren = useCallback(
    (entity: Entity): Entity[] => {
      const children = tree.get(entity)
      return children ? Array.from(children) : []
    },
    [tree]
  )

  const getLabel = useCallback(
    (entity: Entity) => {
      if (entity === ROOT) return 'Root'
      if (!sdk) return entity.toString()
      const { EntityNode } = sdk.components
      return EntityNode.has(entity) ? EntityNode.get(entity).label : entity.toString()
    },
    [sdk]
  )

  const isOpen = useCallback(
    (entity: Entity) => {
      if (entity === ROOT || !sdk) return true
      if (!sdk) return false
      const { Toggle } = sdk.components
      return Toggle.has(entity)
    },
    [sdk]
  )

  const isSelected = useCallback(
    (entity: Entity) => {
      if (entity === ROOT) return false
      if (!sdk) return false
      const { Selection } = sdk.components
      return Selection.has(entity)
    },
    [sdk]
  )

  const addChild = useCallback(
    (parent: Entity, label: string) => {
      if (!sdk) return
      const { EntityNode } = sdk.components
      const child = sdk.engine.addEntity()
      EntityNode.create(child, { label, parent })
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const setParent = useCallback(
    (entity: Entity, parent: Entity) => {
      if (entity === ROOT || !sdk) return
      const { EntityNode, Transform, Toggle } = sdk.components

      EntityNode.getOrCreateMutable(entity).parent = parent

      const transform = Transform.getMutableOrNull(entity)
      if (transform) transform.parent = parent

      Toggle.createOrReplace(parent)
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const rename = useCallback(
    (entity: Entity, label: string) => {
      if (entity === ROOT || !sdk) return
      const { EntityNode } = sdk.components
      EntityNode.getOrCreateMutable(entity).label = label
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const remove = useCallback(
    (entity: Entity) => {
      if (entity === ROOT || !sdk) return
      const { EntityNode } = sdk.components

      // we cannot use "engine.removeEntity" (or similar) since undoing that won't be possible
      // because entities cannot be re-created. It's easier to remove all the components from the entity,
      // and in case of an undo, recreate them...
      for (const _entity of getComponentEntityTree(sdk.engine, entity, EntityNode)) {
        for (const component of sdk.engine.componentsIter()) {
          if (component.has(_entity) && isLastWriteWinComponent(component)) {
            component.deleteFrom(_entity)
          }
        }
      }

      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const toggle = useCallback(
    (entity: Entity, open: boolean) => {
      if (entity === ROOT || !sdk) return
      const { Toggle } = sdk.components

      changeSelectedEntity(entity, sdk.engine)

      if (open) {
        Toggle.createOrReplace(entity)
      } else if (Toggle.has(entity)) {
        Toggle.deleteFrom(entity)
      }

      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const isNotRoot = useCallback((entity: Entity) => entity !== ROOT, [])
  const canRename = isNotRoot
  const canRemove = isNotRoot
  const canToggle = isNotRoot

  return {
    tree,
    addChild,
    setParent,
    rename,
    remove,
    toggle,
    getId,
    getChildren,
    getLabel,
    isOpen,
    isSelected,
    canRename,
    canRemove,
    canToggle
  }
}
