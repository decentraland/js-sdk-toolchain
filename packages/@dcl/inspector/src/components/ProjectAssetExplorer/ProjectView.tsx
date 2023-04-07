/* eslint-disable no-console */
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

const ROOT = 'Project Explorer'

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

type TreeNode = Omit<AssetNode, 'children'> & { children?: string[] }

function Test({ folders }: Props) {
  const getTree = useCallback(() => {
    const tree = new Map<string, TreeNode>()
    tree.set(ROOT, { children: folders.map(f => f.name), name: ROOT, type: 'folder', parent: null })

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
  const [open, setOpen] = useState(new Set<string>())

  const canToggle = useCallback((value: string, toggle: boolean) => {
    if (toggle) {
      open.add(value)
    } else {
      open.delete(value)
    }
    setOpen(new Set(open))
  }, [open, setOpen])

  if (!folders.length) return null

  const expandedClass = open.has(ROOT) && 'expanded'

  return (
    <div className={`testing ${expandedClass}`}>
      <MyTree
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
    </div>

  )
}

export default Test
