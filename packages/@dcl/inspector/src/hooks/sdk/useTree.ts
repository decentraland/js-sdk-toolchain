import { useCallback, useState, useEffect } from 'react'
import { Entity } from '@dcl/ecs'

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
        components: { EntityNode },
        operations
      } = sdk
      return getTreeFromEngine(engine, operations, EntityNode)
    } else {
      return getEmptyTree()
    }
  }, [sdk])

  const [tree, setTree] = useState(getTree())

  useEffect(() => {
    setTree(getTree())
  }, [sdk])

  // Update tree when a change happens in the engine
  // TODO: are we sure about this ? It seems to expensive 🤔
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
      if (entity === ROOT) return 'Scene'
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

  const addChild = useCallback(
    async (parent: Entity, label: string) => {
      if (!sdk) return
      sdk.operations.addChild(parent, label)
      await sdk.operations.dispatch()
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const setParent = useCallback(
    async (entity: Entity, parent: Entity) => {
      if (entity === ROOT || !sdk) return
      const { Toggle } = sdk.components
      sdk.operations.setParent(entity, parent)
      Toggle.createOrReplace(parent)
      await sdk.operations.dispatch()
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const rename = useCallback(
    async (entity: Entity, label: string) => {
      if (entity === ROOT || !sdk) return
      const { EntityNode } = sdk.components
      sdk.operations.updateValue(EntityNode, entity, { label })
      await sdk.operations.dispatch()
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const remove = useCallback(
    async (entity: Entity) => {
      if (entity === ROOT || !sdk) return
      sdk.operations.removeEntity(entity)
      await sdk.operations.dispatch()
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const toggle = useCallback(
    async (entity: Entity, open: boolean) => {
      if (!sdk) return
      if (entity === ROOT) {
        sdk.operations.removeSelectedEntities()
        await sdk.operations.dispatch()
      } else {
        sdk.operations.updateSelectedEntity(entity)

        // TODO: why we have a toggle component?
        // If it's a flag maybe we can use a state ?
        const { Toggle } = sdk.components
        if (open) {
          Toggle.createOrReplace(entity)
        } else if (Toggle.has(entity)) {
          Toggle.deleteFrom(entity)
        }
        // END TODO.
      }

      await sdk.operations.dispatch()
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const isNotRoot = useCallback((entity: Entity) => entity !== ROOT, [])
  const canRename = isNotRoot
  const canRemove = isNotRoot
  const canToggle = useCallback(() => true, [])

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
    canRename,
    canRemove,
    canToggle
  }
}
