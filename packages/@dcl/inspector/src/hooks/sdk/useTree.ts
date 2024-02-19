import { useCallback, useState, useEffect } from 'react'
import { Entity } from '@dcl/ecs'

import { CAMERA, findParent, getEmptyTree, getTreeFromEngine, PLAYER, ROOT } from '../../lib/sdk/tree'
import { debounce } from '../../lib/utils/debounce'
import { getRoot } from '../../lib/sdk/nodes'
import { DropType } from '../../components/Tree/utils'
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
        components: { Nodes }
      } = sdk
      return getTreeFromEngine(engine, Nodes)
    } else {
      return getEmptyTree()
    }
  }, [sdk])

  const [tree, setTree] = useState(getTree())

  useEffect(() => {
    setTree(getTree())
  }, [sdk])

  const handleUpdate = useCallback(() => setTree(getTree()), [setTree, getTree])
  const debounceHandleUpdate = useCallback(debounce(handleUpdate, 10), [handleUpdate])
  useChange(debounceHandleUpdate)

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
      if (entity === PLAYER) return 'Player'
      if (entity === CAMERA) return 'Camera'
      if (!sdk) return entity.toString()
      const { Name } = sdk.components
      return Name.has(entity) ? Name.get(entity).value : entity.toString()
    },
    [sdk]
  )

  const isOpen = useCallback(
    (entity: Entity) => {
      if (!sdk) return false
      const entities = sdk.components.Nodes.getOrNull(ROOT)?.value || []
      return !!entities.find(($) => $.entity === entity)?.open
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
      const nodes = sdk.components.Nodes.getOrNull(parent)?.value || []
      const root = getRoot(parent, nodes)
      if (root === ROOT) {
        sdk.operations.updateSelectedEntity(child)
      }
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
    async (entity: Entity, multiple?: boolean) => {
      if (!sdk) return
      sdk.operations.updateSelectedEntity(entity, !!multiple)
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
      if (!sdk) return

      const { Nodes } = sdk.components
      const nodes = Nodes.getMutable(ROOT).value
      const node = nodes.find(($) => $.entity === entity)

      if (!node) return

      node.open = open // mutate collapsed prop
      sdk.operations.updateValue(Nodes, ROOT, { value: nodes })
      await sdk.operations.dispatch()
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
  const isRoot = useCallback((entity: Entity) => entity === ROOT || entity === PLAYER || entity === CAMERA, [])
  const isNotRoot = useCallback((entity: Entity) => !isRoot(entity), [])
  const canRename = isNotRoot
  const canRemove = isNotRoot
  const canDuplicate = isNotRoot
  const canDrag = isNotRoot
  const canReorder = useCallback(
    (source: Entity, target: Entity, type: DropType) => {
      // can't reorder ROOT entity
      if (isRoot(source)) return false
      // can't reorder an entity before the ROOT entity
      if (isRoot(target) && type === 'before') return false
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
