import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io'
import { FiHexagon } from 'react-icons/fi'

import { ROOT } from '../../lib/sdk/tree'
import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { useTree } from '../../hooks/sdk/useTree'
import { Tree } from '../Tree'
import { ContextMenu } from './ContextMenu'
import './Hierarchy.css'

function HierarchyIcon({ value, hasChildrens, isOpen }: { value: Entity; hasChildrens: boolean; isOpen: boolean }) {
  if (value === ROOT) {
    return <span style={{ marginRight: '14px' }} />
  }
  if (!hasChildrens) {
    return (
      <>
        <span style={{ marginLeft: '14px' }} />
        <FiHexagon />
      </>
    )
  }
  const ArrowComponent = isOpen ? <IoIosArrowDown /> : <IoIosArrowForward />
  return (
    <>
      {ArrowComponent}
      <FiHexagon />
    </>
  )
}

const EntityTree = Tree<Entity>()

const Hierarchy: React.FC = () => {
  const { addChild, setParent, remove, rename, toggle, getId, getChildren, getLabel, isOpen, canRename, canRemove } =
    useTree()
  const selectedEntity = useSelectedEntity()

  const isSelected = useCallback(
    (entity: Entity) => {
      return selectedEntity === entity
    },
    [selectedEntity]
  )
  return (
    <div className="Hierarchy">
      <EntityTree
        value={ROOT}
        getExtraContextMenu={ContextMenu}
        onAddChild={addChild}
        onSetParent={setParent}
        onRemove={remove}
        onRename={rename}
        onToggle={toggle}
        getId={getId}
        getChildren={getChildren}
        getLabel={getLabel}
        getIcon={(val: Entity) => (
          <HierarchyIcon value={val} isOpen={isOpen(val)} hasChildrens={!!getChildren(val).length} />
        )}
        isOpen={isOpen}
        isSelected={isSelected}
        canRename={canRename}
        canRemove={canRemove}
      />
    </div>
  )
}

export default React.memo(Hierarchy)
