import { useCallback, useState } from 'react'
import { useDrag } from 'react-dnd'
import { Entity } from '@dcl/ecs'
import { IoIosArrowDown, IoIosArrowForward, IoIosImage } from 'react-icons/io'

import { useSdk } from '../../hooks/sdk/useSdk'
import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'
import { Tree } from '../Tree'
import { Modal } from '../Modal'
import Button from '../Button'
import FolderIcon from '../Icons/Folder'
import ContextMenu from './ContextMenu'
import { AssetNode, AssetNodeFolder } from './types'
import { getFullNodePath } from './utils'
import Search from '../Search'

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

export const DRAG_N_DROP_ASSET_KEY = 'project-asset-gltf'

export type TreeNode = Omit<AssetNode, 'children'> & { children?: string[]; matches?: string[] }

function ProjectView({ folders, onImportAsset }: Props) {
  const sdk = useSdk()
  const [open, setOpen] = useState(new Set<string>())
  const [modal, setModal] = useState<ModalState | undefined>(undefined)
  const [lastSelected, setLastSelected] = useState<string>()
  const [search, setSearch] = useState<string>('')

  const getTree = useCallback(() => {
    function getPath(node: string, children: string) {
      if (!node) return children
      return `${node}/${children}`
    }
    const tree = new Map<string, TreeNode>()
    tree.set(ROOT, { children: folders.map(f => f.name), name: ROOT, type: 'folder', parent: null })
    open.add(ROOT)

    function hasMatch (name: string) {
      return search && name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    }

    function generateTree(node: AssetNodeFolder, parentName: string = ''): string[] {
      const namePath = getPath(parentName, node.name)
      const childrens = node.children.map(c => `${namePath}/${c.name}`)
      const matchesList: string[] = []
      for (const children of node.children) {
        if (children.type === 'folder') {
          matchesList.push(...generateTree(children, node.name))
        } else {
          const name = getPath(namePath, children.name)
          const matches = hasMatch(name)
          if (matches) {
            open.add(name)
            matchesList.push(name)
          }
          tree.set(name, { ...children, matches: matches ? [name] : [], parent: node })
        }
      }
      if (matchesList.length) {
        open.add(namePath)
      }
      tree.set(namePath, { ...node, children: childrens, parent: null, matches: matchesList })
      return matchesList
    }

    for (const f of folders) {
      generateTree(f)
    }
    return tree
  }, [folders, search])

  /**
   * Values
   */
  const tree = getTree()
  const selectedTreeNode = tree.get(lastSelected ?? ROOT)

  /**
   * Callbacks
   */
  const onToggle = useCallback((value: string, toggle: boolean) => {
    setLastSelected(value)
    if (toggle) {
      open.add(value)
    } else {
      open.delete(value)
    }
    setOpen(new Set(open))
  }, [open, setOpen, setLastSelected])

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
  }, [sdk, modal])

  const handleRemove = useCallback(async (value: string) => {
    const path = getFullNodePath(tree.get(value)!).slice(1)
    const entitiesWithAsset = getEntitiesWithAsset(path)
    if (entitiesWithAsset.length) {
      return setModal({ isOpen: true, value: path, entities: entitiesWithAsset })
    }
    await removeAsset(path)
  }, [open, setOpen])

  const removeAsset = useCallback(async (path: string, entities: Entity[] = []) => {
    if (!sdk) return
    const { dataLayer, components, operations } = sdk
    fileSystemEvent.emit('change')
    entities.forEach(($) => operations.updateValue(components.GltfContainer, $, { src: '' }))
    await Promise.all([dataLayer.removeAsset({ path }), operations.dispatch()])
  }, [sdk])

  const handleConfirm = useCallback(async () => {
    if (!modal) return
    await removeAsset(modal.value, modal.entities)
    setModal(undefined)
  }, [modal, setModal])

  const handleModalClose = useCallback(() => setModal(undefined), [])
  const handleClickFolder = useCallback((val: string) => () => {
    if (lastSelected === val) return
    open.add(val)
    setLastSelected(val)
  }, [setLastSelected])
  const handleDragContext = useCallback(() => ({ tree }), [tree])
  const isOpen = useCallback((val: string) => open.has(val), [open])

  const getChildren = useCallback((val: string) => {
    const value = tree.get(val)
    if (!value?.children?.length) return []
    if (!search.length) return value.children

    return value.children.filter(($) => {
      const childrenValue = tree.get($)
      return !!childrenValue?.matches?.length
    })
  }, [tree, search])

  return (
    <>
      <Modal isOpen={!!modal?.isOpen} onRequestClose={handleModalClose} className="RemoveAsset">
        <h2>⚠️ Removing this asset will break some components</h2>
        <div>
          <Button type="danger" size="big" onClick={handleConfirm}>Delete anyway</Button>
          <Button size="big" onClick={handleModalClose}>Cancel</Button>
        </div>
      </Modal>
      <div className="ProjectView">
        <div className="Tree-View">
          <Search value={search} onChange={setSearch} placeholder="Search local assets" onCancel={() => setSearch('')} />
          <MyTree
            tree={tree}
            className="editor-assets-tree"
            value={ROOT}
            onAddChild={noop}
            onSetParent={noop}
            onRemove={handleRemove}
            onRename={noop}
            onToggle={onToggle}
            getId={(value: string) => value.toString()}
            getChildren={getChildren}
            getLabel={(val: string) => <span >{tree.get(val)?.name ?? val}</span>}
            isOpen={isOpen}
            isSelected={(val: string) => lastSelected === val}
            canRename={() => false}
            canRemove={(val) => tree.get(val)?.type === 'asset'}
            canToggle={() => true}
            canAddChild={() => false}
            getIcon={(val) => <NodeIcon value={tree.get(val)} isOpen={isOpen(val)} />}
            getDragContext={handleDragContext}
            dndType={DRAG_N_DROP_ASSET_KEY}
          />
        </div>
        <div className="FolderView">
          {selectedTreeNode?.type === 'folder'
            ? selectedTreeNode?.children?.map($ => <NodeView key={$} valueId={$} getDragContext={handleDragContext} value={tree.get($)} onSelect={handleClickFolder($)} />)
            : !!selectedTreeNode && lastSelected && <NodeView valueId={lastSelected} value={selectedTreeNode} onSelect={handleClickFolder(selectedTreeNode.name)} getDragContext={handleDragContext}/>
          }
        </div>
      </div>
    </>
  )
}

function NodeView({ valueId, value, onSelect, getDragContext }: { value?: TreeNode, onSelect: () => void, getDragContext: () => unknown, valueId: string }) {
  if (!value) return null
  const [, drag] = useDrag(() => ({ type: DRAG_N_DROP_ASSET_KEY, item: { value: valueId, context: getDragContext() } }), [valueId])
  return (
    <div ref={drag} className="NodeView" key={value.name} onDoubleClick={onSelect}>
      {value.type === 'folder' ? <FolderIcon /> : <IoIosImage />}
      <span>{value.name}</span>
    </div>
  )
}

function NodeIcon({ value, isOpen }: { value?: TreeNode, isOpen: boolean }) {
  if (!value) return null
  if (value.type === 'folder') {
    return isOpen ? <><IoIosArrowDown /><FolderIcon/></> : <><IoIosArrowForward /><FolderIcon/></>
  }
  return <><svg style={{ width: '4px', height: '4px' }} /><IoIosImage /></>
}

export default ProjectView
