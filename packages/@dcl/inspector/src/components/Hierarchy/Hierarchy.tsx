import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io'
import { FiHexagon } from 'react-icons/fi'

import { ROOT } from '../../lib/sdk/tree'
import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { useTree } from '../../hooks/sdk/useTree'
import { Container } from '../Container'
import { Tree } from '../Tree'
import { ContextMenu } from './ContextMenu'

const Hierarchy: React.FC = () => {
  const {
    addChild,
    setParent,
    remove,
    rename,
    toggle,
    getId,
    getChildren,
    getLabel,
    isOpen,
    canRename,
    canRemove,
    canToggle
  } = useTree()
  const selectedEntity = useSelectedEntity()

  const isSelected = useCallback((entity: Entity) => {
      if (entity === ROOT) return !selectedEntity
      return selectedEntity === entity
    },
    [selectedEntity]
  )

  return (
    <Container>
      <Tree
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
        getIcon={(val: Entity) => {
          const hasChildrens = !!getChildren(val).length
          if (val === ROOT) {
            return <span style={{ marginRight: '14px' }} />
          }
          if (!hasChildrens) {
            return <><span style={{ marginLeft: '14px' }} /><FiHexagon /></>
          }
          const ArrowComponent = isOpen(val) ? <IoIosArrowDown /> : <IoIosArrowForward/>
          return <>{ArrowComponent}<FiHexagon /></>
        }}
        isOpen={isOpen}
        isSelected={isSelected}
        canRename={canRename}
        canRemove={canRemove}
        canToggle={canToggle}
      />
    </Container>
  )
}

export default React.memo(Hierarchy)
