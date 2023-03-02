import * as React from 'react'
import { ROOT, useTree } from '../../hooks/sdk/tree'
import { InspectorEngine } from '../../lib/sdk/engine'
import { Tree } from '../Tree'

type Props = {
  inspectorEngine: InspectorEngine
}

const Hierarchy: React.FC<Props> = (props) => {
  const { tree, addChild, setParent, remove, rename, toggle, getId, getChildren, getLabel, isOpen, isSelected } =
    useTree(props.inspectorEngine)
  return (
    <>
      {Array.from(tree.get(ROOT)!).map((entity) => (
        <Tree
          key={getId(entity)}
          value={entity}
          onAddChild={addChild}
          onSetParent={setParent}
          onRemove={remove}
          onRename={rename}
          onToggle={toggle}
          getId={getId}
          getChildren={getChildren}
          getLabel={getLabel}
          isOpen={isOpen}
          isSelected={isSelected}
        />
      ))}
    </>
  )
}

export default Hierarchy
