import { useCallback, useState, useEffect } from 'react'
import { Entity } from '@dcl/ecs'

import { getEmptyTree, getTreeFromEngine, ROOT } from '../../lib/sdk/tree'
import { useChange } from './useChange'
import { useSdk } from './useSdk'

/**
 * Used to get a tree and the functions to work with it
 * @returns
 */
/* istanbul ignore next */
export const useTree = () => {
  const sdk = useSdk()
  // Generate a tree if the sdk is available, or an empty tree otherwise
  const getTree = useCallback(() => {
    if (sdk) {
      const {
        engine,
        components: { Transform },
        operations
      } = sdk
      return getTreeFromEngine(engine, operations, Transform)
    } else {
      return getEmptyTree()
    }
  }, [sdk])

  const [tree, setTree] = useState(getTree())
  const entitiesToggle = new Set<Entity>([ROOT])

  useEffect(() => {
    setTree(getTree())
  }, [sdk])

  // Update tree when a change happens in the engine
  // TODO: are we sure about this ? It seems too expensive 🤔
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
      const { Name } = sdk.components
      return Name.has(entity) ? Name.get(entity).value : entity.toString()
    },
    [sdk]
  )

  const isOpen = useCallback(
    (entity: Entity) => {
      return entitiesToggle.has(entity)
    },
    [sdk]
  )

  const isHidden = useCallback((_: Entity) => {
    return false
  }, [])

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
      sdk.operations.setParent(entity, parent)
      entitiesToggle.add(parent)
      await sdk.operations.dispatch()
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const rename = useCallback(
    async (entity: Entity, value: string) => {
      if (entity === ROOT || !sdk) return
      const { Name } = sdk.components
      sdk.operations.updateValue(Name, entity, { value })
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

  const select = useCallback(
    async (entity: Entity) => {
      if (!sdk) return
      sdk.operations.updateSelectedEntity(entity)
      await sdk.operations.dispatch()
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const duplicate = useCallback(
    async (entity: Entity) => {
      if (entity === ROOT || !sdk) return
      sdk.operations.duplicateEntity(entity)
      await sdk.operations.dispatch()
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const setOpen = useCallback(
    async (entity: Entity, open: boolean) => {
      open ? entitiesToggle.add(entity) : entitiesToggle.delete(entity)
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const isNotRoot = useCallback((entity: Entity) => entity !== ROOT, [])
  const canRename = isNotRoot
  const canRemove = isNotRoot
  const canDuplicate = isNotRoot

  return {
    tree,
    addChild,
    setParent,
    rename,
    remove,
    select,
    duplicate,
    getId,
    getChildren,
    getLabel,
    setOpen,
    isOpen,
    isHidden,
    canRename,
    canRemove,
    canDuplicate
  }
}
