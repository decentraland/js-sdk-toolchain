import React, { useCallback, useMemo, useState } from 'react'
import { Entity } from '@dcl/ecs'

import { CAMERA, PLAYER, ROOT } from '../../lib/sdk/tree'
import { useEntitiesWith } from '../../hooks/sdk/useEntitiesWith'
import { useTree } from '../../hooks/sdk/useTree'
import { Tree } from '../Tree'
import { ContextMenu } from './ContextMenu'
import { withSdk } from '../../hoc/withSdk'
import './Hierarchy.css'
import { useAppSelector } from '../../redux/hooks'
import { selectCustomAssets } from '../../redux/app'

const HierarchyIcon = withSdk<{ value: Entity }>(({ sdk, value }) => {
  const customAssets = useAppSelector(selectCustomAssets)
  const isSmart = useMemo(
    () =>
      sdk.components.Actions.has(value) ||
      sdk.components.Triggers.has(value) ||
      sdk.components.States.has(value) ||
      sdk.components.TextShape.has(value) ||
      sdk.components.NftShape.has(value) ||
      sdk.components.VisibilityComponent.has(value) ||
      sdk.components.VideoScreen.has(value) ||
      sdk.components.AdminTools.has(value),
    [sdk, value]
  )

  const isCustom = useMemo(() => {
    if (sdk.components.CustomAsset.has(value)) {
      const { assetId } = sdk.components.CustomAsset.get(value)
      const customAsset = customAssets.find((asset) => asset.id === assetId)
      return !!customAsset
    }
    return false
  }, [sdk, value, customAssets])

  const isTile = useMemo(() => sdk.components.Tile.has(value), [sdk, value])

  const isGroup = useMemo(() => {
    const nodes = sdk.components.Nodes.getOrNull(ROOT)?.value
    const node = nodes?.find((node) => node.entity === value)
    return node && node.children.length > 0
  }, [value])

  if (value === ROOT) {
    return <span style={{ marginRight: '4px' }}></span>
  } else if (value === PLAYER) {
    return <span className="tree-icon player-icon"></span>
  } else if (value === CAMERA) {
    return <span className="tree-icon camera-icon"></span>
  } else if (isCustom) {
    return <span className="tree-icon custom-icon"></span>
  } else if (isGroup) {
    return <span className="tree-icon group-icon"></span>
  } else if (isSmart) {
    return <span className="tree-icon smart-icon"></span>
  } else if (isTile) {
    return <span className="tree-icon tile-icon"></span>
  } else {
    return <span className="tree-icon entity-icon"></span>
  }
})

const EntityTree = Tree<Entity>()

const Hierarchy: React.FC = () => {
  const {
    addChild,
    setParent,
    remove,
    rename,
    select,
    setOpen,
    duplicate,
    getId,
    getChildren,
    getLabel,
    getSelectedItems,
    isOpen,
    isHidden,
    canRename,
    canRemove,
    canDuplicate,
    canDrag,
    canReorder,
    centerViewOnEntity
  } = useTree()
  const selectedEntities = useEntitiesWith((components) => components.Selection)
  const [lastSelectedItem, setLastSelectedItem] = useState<Entity | undefined>(undefined)

  const isSelected = useCallback(
    (entity: Entity) => {
      return selectedEntities.includes(entity)
    },
    [selectedEntities]
  )

  const getAllVisibleEntities = useCallback(() => {
    const entities: Entity[] = []

    const traverse = (entity: Entity) => {
      if (!isHidden(entity)) {
        entities.push(entity)
        if (isOpen(entity)) {
          getChildren(entity).forEach((child) => traverse(child))
        }
      }
    }

    traverse(ROOT)

    return entities
  }, [getChildren, isOpen, isHidden])

  const handleRangeSelection = useCallback(
    (fromEntity: Entity, toEntity: Entity) => {
      const allEntities = getAllVisibleEntities()
      const fromIndex = allEntities.findIndex((e) => getId(e) === getId(fromEntity))
      const toIndex = allEntities.findIndex((e) => getId(e) === getId(toEntity))

      const startIndex = Math.min(fromIndex, toIndex)
      const endIndex = Math.max(fromIndex, toIndex)

      allEntities.forEach((entity, index) => {
        if (index >= startIndex && index <= endIndex) {
          void select(entity, index > startIndex) // first item replaces selection, others add to selection
        }
      })
    },
    [getAllVisibleEntities, getId, select]
  )

  const handleSelect = useCallback(
    (entity: Entity, clickType?: 'single' | 'ctrl' | 'shift') => {
      if (clickType === 'shift' && lastSelectedItem) {
        handleRangeSelection(lastSelectedItem, entity)
      } else {
        const isMultipleSelection = clickType === 'ctrl' || clickType === 'shift'
        void select(entity, isMultipleSelection)
      }
    },
    [select, lastSelectedItem, handleRangeSelection]
  )

  const handleLastSelectedChange = useCallback(
    (entity: Entity) => {
      if (entity !== lastSelectedItem) setLastSelectedItem(entity)
    },
    [lastSelectedItem]
  )

  const props = {
    getExtraContextMenu: ContextMenu,
    onAddChild: addChild,
    onDrop: setParent,
    onRemove: remove,
    onRename: rename,
    onSelect: handleSelect,
    onDoubleSelect: centerViewOnEntity,
    onSetOpen: setOpen,
    onDuplicate: duplicate,
    getId: getId,
    getChildren: getChildren,
    getLabel: getLabel,
    getSelectedItems: getSelectedItems,
    getIcon: (val: Entity) => <HierarchyIcon value={val} />,
    isOpen: isOpen,
    isSelected: isSelected,
    isHidden: isHidden,
    canRename: canRename,
    canRemove: canRemove,
    canDuplicate: canDuplicate,
    canDrag: canDrag,
    canReorder: canReorder,
    onLastSelectedChange: handleLastSelectedChange
  }

  return (
    <div className="Hierarchy">
      <EntityTree value={PLAYER} {...props} />
      <EntityTree value={CAMERA} {...props} />
      <EntityTree value={ROOT} {...props} />
    </div>
  )
}

export default React.memo(Hierarchy)
