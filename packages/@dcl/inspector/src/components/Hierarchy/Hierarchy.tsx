import * as React from 'react'
import { useTree } from '../../hooks/sdk/tree'
import { Tree } from '../Tree'

const Hierarchy: React.FC = () => {
  const { tree, addChild, setParent, remove, rename } = useTree()
  return (
    <>
      {tree.map((node) => (
        <Tree
          key={node.id}
          value={node}
          onAddChild={addChild}
          onSetParent={setParent}
          onRemove={remove}
          onRename={rename}
        />
      ))}
    </>
  )
}

export default Hierarchy
