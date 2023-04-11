import React, { useCallback, useState } from 'react'
import { IoIosArrowDown, IoIosArrowForward, IoIosImage } from 'react-icons/io'
import { useDrag } from 'react-dnd'

import { Tree } from '../Tree'
import { AssetNode, AssetNodeFolder } from './types'

function noop() {}
// eslint-disable-next-line prettier/prettier
const MyTree = Tree<string>;

type Props = {
  folders: AssetNodeFolder[]
}

const ROOT = 'File System'


type TreeNode = Omit<AssetNode, 'children'> & { children?: string[] }

function ProjectView({ folders }: Props) {
  const [open, setOpen] = useState(new Set<string>())
  const getTree = useCallback(() => {
    const tree = new Map<string, TreeNode>()
    tree.set(ROOT, { children: folders.map(f => f.name), name: ROOT, type: 'folder', parent: null })
    open.add(ROOT)
    function generateTree(node: AssetNodeFolder) {
      const childrens = node.children.map(c => c.name)
      tree.set(node.name, { ...node, children: childrens })

      for (const children of node.children) {
        if (children.type === 'folder') {
          generateTree(children)
          return
        } else {
          tree.set(children.name, children)
        }
      }
    }

    for (const f of folders) {
      generateTree(f)
    }

    return tree
  }, [folders])
  const tree = getTree()

  const canToggle = useCallback((value: string, toggle: boolean) => {
    if (toggle) {
      open.add(value)
    } else {
      open.delete(value)
    }
    setOpen(new Set(open))
  }, [open, setOpen])

  if (!folders.length) return null

  return (
    <MyTree
      className="editor-assets-tree"
      value={ROOT}
      onAddChild={noop}
      onSetParent={noop}
      onRemove={noop}
      onRename={noop}
      onToggle={canToggle}
      getId={(value: string) => value.toString()}
      getChildren={(name: string) => [...tree.get(name)?.children || []]}
      getLabel={(val: string) => <NodeLabel value={tree.get(val)!} />}
      isOpen={(val: string) => open.has(val)}
      isSelected={(val: string) => open.has(val)}
      canRename={() => false}
      canRemove={() => false}
      canToggle={() => true}
      getIcon={(val) => <NodeIcon value={tree.get(val)!} isOpen={open.has(val)} />}
    />
  )
}

function NodeLabel({ value }: { value: TreeNode }) {
  if (value.type === 'asset') {
    const [, drag] = useDrag(() => ({ type: 'project-asset-gltf', item: { asset: value } }), [value])
    return <span ref={drag}>{value.name}</span>
  }

  return <span>{value.name}</span>

}

function NodeIcon({ value, isOpen }: { value: TreeNode, isOpen: boolean }) {
  if (value.type === 'folder') {
    return isOpen ? <IoIosArrowDown /> : <IoIosArrowForward />
  }
  return <IoIosImage />
}

export default ProjectView