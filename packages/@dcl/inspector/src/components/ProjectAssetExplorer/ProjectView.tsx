import { Entity } from '@dcl/ecs'
import { useCallback, useState } from 'react'
import { IoIosArrowDown, IoIosArrowForward, IoIosImage } from 'react-icons/io'
import { AiFillFolder } from 'react-icons/ai'

import { useSdk } from '../../hooks/sdk/useSdk'
import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'
import { Tree } from '../Tree'
import { Modal } from '../Modal'
import Button from '../Button'

import ContextMenu from './ContextMenu'
import { AssetNode, AssetNodeFolder } from './types'
import { getFullNodePath } from './utils'

function noop() {}
// eslint-disable-next-line prettier/prettier
const MyTree = Tree<string>;

type Props = {
  onImportAsset(): void
  folders: AssetNodeFolder[]
}

interface ModalState {
  isOpen: boolean
  value: string
  entities: Entity[]
}

export const ROOT = 'File System'

export type TreeNode = Omit<AssetNode, 'children'> & { children?: string[] }

function ProjectView({ folders, onImportAsset }: Props) {
  const sdk = useSdk()
  const [open, setOpen] = useState(new Set<string>())
  const [modal, setModal] = useState<ModalState | undefined>(undefined)
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

  const getEntitiesWithAsset = useCallback((value: string): Entity[] => {
    if (!sdk || modal?.isOpen) return []
    const entitiesWithAsset: Entity[] = []
    const { GltfContainer } = sdk.components
    for (const [entity, _value] of sdk.engine.getEntitiesWith(GltfContainer)) {
      if (_value.src === value) {
        entitiesWithAsset.push(entity)
      }
    }
    return entitiesWithAsset
  }, [])

  const handleRemove = useCallback(async (value: string) => {
    const path = getFullNodePath(tree.get(value)!).slice(1)
    const entitiesWithAsset = getEntitiesWithAsset(path)
    if (entitiesWithAsset.length) return setModal({ isOpen: true, value: path, entities: entitiesWithAsset })
    await removeAsset(path)
  }, [open, setOpen])

  const removeAsset = useCallback(async (path: string, entities: Entity[] = []) => {
    if (!sdk) return
    const { dataLayer, components, operations } = sdk
    fileSystemEvent.emit('change')
    entities.forEach(($) => operations.updateValue(components.GltfContainer, $, { src: '' }))
    await Promise.all([dataLayer.removeAsset({ path }), operations.dispatch()])
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!modal) return
    await removeAsset(modal.value, modal.entities)
    setModal(undefined)
  }, [modal, setModal])

  const handleModalClose = useCallback(() => setModal(undefined), [])

  if (!folders.length) return null

  return (
    <div className="ProjectView">
      <Modal isOpen={!!modal?.isOpen} onRequestClose={handleModalClose} className="RemoveAsset">
        <h2>⚠️ Removing this asset will break some components</h2>
        <div>
          <Button type="danger" size="big" onClick={handleConfirm}>Delete anyway</Button>
          <Button size="big" onClick={handleModalClose}>Cancel</Button>
        </div>
      </Modal>
      <MyTree
        className="editor-assets-tree"
        value={ROOT}
        onAddChild={noop}
        onSetParent={noop}
        onRemove={handleRemove}
        onRename={noop}
        onToggle={canToggle}
        getId={(value: string) => value.toString()}
        getChildren={(name: string) => [...tree.get(name)?.children || []]}
        getLabel={(val: string) => tree.has(val) ? tree.get(val)!.name : ''}
        isOpen={(val: string) => open.has(val)}
        isSelected={(val: string) => open.has(val)}
        canRename={() => false}
        canRemove={(val) => tree.get(val)!.type === 'asset'}
        canToggle={() => true}
        canAddChild={() => false}
        getIcon={(val) => <NodeIcon value={tree.get(val)!} isOpen={open.has(val)} />}
        getDragContext={() => ({ tree })}
        dndType="project-asset-gltf"
        getExtraContextMenu={(val) => <ContextMenu value={tree.get(val)} onImportAsset={onImportAsset} />}
      />
    </div>
  )
}

function NodeIcon({ value, isOpen }: { value: TreeNode, isOpen: boolean }) {
  if (value.type === 'folder') {
    return isOpen ? <><IoIosArrowDown /><AiFillFolder/></> : <><IoIosArrowForward /><AiFillFolder/></>
  }
  return <IoIosImage />
}

export default ProjectView
