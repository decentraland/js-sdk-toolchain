import React, { useCallback, useMemo } from 'react'
import { Entity } from '@dcl/ecs'

import { CAMERA, PLAYER, ROOT } from '../../lib/sdk/tree'
import { useEntitiesWith } from '../../hooks/sdk/useEntitiesWith'
import { useTree } from '../../hooks/sdk/useTree'
import { Tree } from '../Tree'
import { ContextMenu } from './ContextMenu'
import { withSdk } from '../../hoc/withSdk'
import './Hierarchy.css'

const HierarchyIcon = withSdk<{ value: Entity }>(({ sdk, value }) => {
  const isSmart = useMemo(
    () =>
      sdk.components.Actions.has(value) ||
      sdk.components.Triggers.has(value) ||
      sdk.components.States.has(value) ||
      sdk.components.TextShape.has(value) ||
      sdk.components.NftShape.has(value) ||
      sdk.components.VisibilityComponent.has(value),
    [sdk, value]
  )

  const isTile = useMemo(() => sdk.components.Tile.has(value), [sdk, value])

  const isGroup = useMemo(() => {
    const nodes = sdk.components.Nodes.get(ROOT).value
    const node = nodes.find((node) => node.entity === value)
    return node!.children.length > 0
  }, [value])

  if (value === ROOT) {
    return <span style={{ marginRight: '4px' }}></span>
  } else if (value === PLAYER) {
    return <span className="tree-icon player-icon"></span>
  } else if (value === CAMERA) {
    return <span className="tree-icon camera-icon"></span>
  } else if (isSmart) {
    return <span className="tree-icon smart-icon"></span>
  } else if (isTile) {
    return <span className="tree-icon tile-icon"></span>
  } else if (isGroup) {
    return <span className="tree-icon group-icon"></span>
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

  const isSelected = useCallback(
    (entity: Entity) => {
      return selectedEntities.includes(entity)
    },
    [selectedEntities]
  )

  const props = {
    getExtraContextMenu: ContextMenu,
    onAddChild: addChild,
    onDrop: setParent,
    onRemove: remove,
    onRename: rename,
    onSelect: select,
    onDoubleSelect: centerViewOnEntity,
    onSetOpen: setOpen,
    onDuplicate: duplicate,
    getId: getId,
    getChildren: getChildren,
    getLabel: getLabel,
    getIcon: (val: Entity) => <HierarchyIcon value={val} />,
    isOpen: isOpen,
    isSelected: isSelected,
    isHidden: isHidden,
    canRename: canRename,
    canRemove: canRemove,
    canDuplicate: canDuplicate,
    canDrag: canDrag,
    canReorder: canReorder
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
