import * as React from 'react'
import { useTree } from '../../hooks/sdk/tree'
import { Tree } from '../Tree'

const Hierarchy: React.FC = () => {
  const [tree, addChild, setParent, remove, rename] = useTree()
  return <Tree value={tree} onAddChild={addChild} onSetParent={setParent} onRemove={remove} onRename={rename} />
}

export default React.memo(Hierarchy)
