import { useCallback, useState, useEffect } from 'react'
import { Entity } from '@dcl/ecs'

import { findParent, getEmptyTree, getTreeFromEngine, ROOT } from '../../lib/sdk/tree'
import { useChange } from './useChange'
import { useSdk } from './useSdk'
import { DropType } from '../../components/Tree/utils'

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
        components: { Nodes }
      } = sdk
      return getTreeFromEngine(engine, Nodes)
    } else {
      return getEmptyTree()
    }
  }, [sdk])

  const [tree, setTree] = useState(getTree())
  const entitiesToggle = new Set<Entity>([ROOT])

  useEffect(() => {
    setTree(getTree())
  }, [sdk])

  const handleUpdate = useCallback(() => setTree(getTree()), [setTree, getTree])
  useChange(handleUpdate)

  const getId = useCallback((entity: Entity) => entity.toString(), [])

  const getChildren = useCallback(
    (entity: Entity): Entity[] => {
      return Array.from(tree.get(entity) || [])
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
      const child = sdk.operations.addChild(parent, label)
      sdk.operations.updateSelectedEntity(child)
      await sdk.operations.dispatch()
      handleUpdate()
    },
    [sdk, handleUpdate]
  )

  const getNewParent = useCallback(
    (target: Entity, type: DropType): Entity => {
      if (type === 'inside') return target

      const hasChildren = !!tree.get(target)?.size
      if (hasChildren && type === 'after' && isOpen(target)) return target

      const targetParent = findParent(tree, target)
      return targetParent
    },
    [sdk, handleUpdate, tree]
  )

  const setParent = useCallback(
    async (source: Entity, target: Entity, type: DropType) => {
      if (source === ROOT || !sdk) return

      const { setParent, reorder, dispatch } = sdk.operations
      const newParent = getNewParent(target, type)

      setParent(source, newParent)
      if (type !== 'inside') reorder(source, target, newParent)

      await dispatch()
      await setOpen(newParent, true)
    },
    [sdk, handleUpdate, tree]
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

  const centerViewOnEntity = useCallback(
    (entity: Entity) => {
      if (!sdk || entity === ROOT) return
      const babylonEntity = sdk.sceneContext.getEntityOrNull(entity)
      if (babylonEntity !== null) sdk.editorCamera.centerViewOnEntity(babylonEntity)
    },
    [sdk]
  )

  const isNotRoot = useCallback((entity: Entity) => entity !== ROOT, [])
  const canRename = isNotRoot
  const canRemove = isNotRoot
  const canDuplicate = isNotRoot
  const canDrag = isNotRoot
  const canReorder = useCallback(
    (source: Entity, target: Entity, type: DropType) => {
      // can't reorder ROOT entity
      if (source === ROOT) return false
      // can't reorder an entity before the ROOT entity
      if (target === ROOT && type === 'before') return false
      // can't reorder entity in target "inside" target
      if (findParent(tree, source) === target && type === 'inside') return false
      return true
    },
    [tree]
  )

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
    canDuplicate,
    canDrag,
    canReorder,
    centerViewOnEntity
  }
}
