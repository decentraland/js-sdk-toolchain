import { Entity } from '@dcl/ecs'
import { useCallback, useState } from 'react'
import { getEmptyTree, getTreeFromEngine, ROOT } from '../../lib/sdk/tree'
import { useChange } from './useChange'
import { useSdk } from './useSdk'

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
      const { EntitySelected } = sdk.components
      return EntitySelected.has(entity)
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
      console.log('setParent', entity, parent)
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
      sdk.engine.removeEntity(entity)
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const toggle = useCallback(
    (entity: Entity, open: boolean) => {
      if (entity === ROOT || !sdk) return
      const { Toggle, EntitySelected } = sdk.components
      for (const [_entity] of sdk.engine.getEntitiesWith(EntitySelected)) {
        if (_entity !== entity && EntitySelected.has(_entity)) {
          EntitySelected.deleteFrom(_entity)
        }
      }
      EntitySelected.createOrReplace(entity, { gizmo: 1 })

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
