import React, { useCallback, useEffect, useState } from 'react'
import { Entity } from '@dcl/ecs'
import { IoIosImage } from 'react-icons/io'

import { useSdk } from '../../hooks/sdk/useSdk'
import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'
import { Tile } from './Tile'
import { Tree } from '../Tree'
import { Modal } from '../Modal'
import Button from '../Button'
import FolderIcon from '../Icons/Folder'
import { AssetNode, AssetNodeFolder } from './types'
import { getFullNodePath } from './utils'
import Search from '../Search'
import { withAssetDir } from '../../lib/data-layer/host/fs-utils'

function noop() {}

type Props = {
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

const FilesTree = Tree<string>()

function ProjectView({ folders }: Props) {
  const sdk = useSdk()
  const [open, setOpen] = useState(new Set<string>())
  const [modal, setModal] = useState<ModalState | undefined>(undefined)
  const [lastSelected, setLastSelected] = useState<string>()
  const [search, setSearch] = useState<string>('')
  const [tree, setTree] = useState<Map<string, TreeNode>>(new Map())

  const getTree = useCallback(() => {
    function getPath(node: string, children: string) {
      if (!node) return children
      return `${node}/${children}`
    }
    const tree = new Map<string, TreeNode>()
    tree.set(ROOT, { children: folders.map((f) => f.name), name: ROOT, type: 'folder', parent: null })
    open.add(ROOT)

    function hasMatch(name: string) {
      return search && name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    }

    function generateTree(node: AssetNodeFolder, parentName: string = ''): string[] {
      const namePath = getPath(parentName, node.name)
      const childrens = node.children.map((c) => `${namePath}/${c.name}`)
      const matchesList: string[] = []
      for (const children of node.children) {
        if (children.type === 'folder') {
          matchesList.push(...generateTree(children, namePath))
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

  useEffect(() => {
    setTree(getTree())
  }, [folders, search])

  /**
   * Values
   */
  const selectedTreeNode = tree.get(lastSelected ?? ROOT)

  /**
   * Callbacks
   */

  const onSelect = useCallback(
    (value: string) => {
      setLastSelected(value)
    },
    [setLastSelected]
  )

  const onSetOpen = useCallback(
    (value: string, isOpen: boolean) => {
      if (isOpen) {
        open.add(value)
      } else {
        open.delete(value)
      }
      setOpen(new Set(open))
    },
    [open, setOpen]
  )

  const getEntitiesWithAsset = useCallback(
    (value: string): Entity[] => {
      if (!sdk || modal?.isOpen) return []
      const entitiesWithAsset: Entity[] = []
      const { GltfContainer } = sdk.components
      for (const [entity, _value] of sdk.engine.getEntitiesWith(GltfContainer)) {
        if (_value.src === value) {
          entitiesWithAsset.push(entity)
        }
      }
      return entitiesWithAsset
    },
    [sdk, modal]
  )

  const handleRemove = useCallback(
    async (value: string) => {
      const path = withAssetDir(getFullNodePath(tree.get(value)!).slice(1))
      const entitiesWithAsset = getEntitiesWithAsset(path)
      if (entitiesWithAsset.length) {
        return setModal({ isOpen: true, value: path, entities: entitiesWithAsset })
      }
      await removeAsset(path)
    },
    [open, setOpen, selectedTreeNode, lastSelected]
  )

  const removeAsset = useCallback(
    async (path: string, _: Entity[] = []) => {
      if (!sdk) return
      const { dataLayer } = sdk
      await dataLayer.removeAsset({ path })
      fileSystemEvent.emit('change')
    },
    [sdk]
  )

  const handleConfirm = useCallback(async () => {
    if (!modal) return
    await removeAsset(modal.value, modal.entities)
    setModal(undefined)
  }, [modal, setModal])

  const handleModalClose = useCallback(() => setModal(undefined), [])
  const handleClickFolder = useCallback(
    (val: string) => () => {
      if (lastSelected === val) return
      open.add(val)
      setLastSelected(val)
    },
    [setLastSelected]
  )
  const handleDragContext = useCallback(() => ({ tree }), [tree])
  const isOpen = useCallback((val: string) => open.has(val), [open])

  const getChildren = useCallback(
    (val: string) => {
      const value = tree.get(val)
      if (!value?.children?.length) return []
      if (!search.length) return value.children

      return value.children.filter(($) => {
        const childrenValue = tree.get($)
        return !!childrenValue?.matches?.length
      })
    },
    [tree, search]
  )

  return (
    <>
      <Modal isOpen={!!modal?.isOpen} onRequestClose={handleModalClose} className="RemoveAsset">
        <h2>⚠️ Removing this asset will break some components</h2>
        <div>
          <Button type="danger" size="big" onClick={handleConfirm}>
            Delete anyway
          </Button>
          <Button size="big" onClick={handleModalClose}>
            Cancel
          </Button>
        </div>
      </Modal>
      <div className="ProjectView">
        <div className="Tree-View">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search local assets"
            onCancel={() => setSearch('')}
          />
          <FilesTree
            tree={tree}
            className="editor-assets-tree"
            value={ROOT}
            onAddChild={noop}
            onSetParent={noop}
            onRemove={handleRemove}
            onRename={noop}
            onSelect={onSelect}
            onSetOpen={onSetOpen}
            getId={(value: string) => value.toString()}
            getChildren={getChildren}
            getLabel={(val: string) => <span>{tree.get(val)?.name ?? val}</span>}
            isOpen={isOpen}
            isSelected={(val: string) => lastSelected === val}
            isHidden={(val: string) => val === ROOT}
            canRename={() => false}
            canRemove={(val) => tree.get(val)?.type === 'asset'}
            canAddChild={() => false}
            getIcon={(val) => <NodeIcon value={tree.get(val)} />}
            getDragContext={handleDragContext}
            dndType={DRAG_N_DROP_ASSET_KEY}
          />
        </div>
        <div className="FolderView">
          {selectedTreeNode?.type === 'folder'
            ? selectedTreeNode?.children?.map(($) => (
                <Tile
                  key={$}
                  valueId={$}
                  value={tree.get($)}
                  getDragContext={handleDragContext}
                  onSelect={handleClickFolder($)}
                  onRemove={handleRemove}
                  dndType={DRAG_N_DROP_ASSET_KEY}
                />
              ))
            : !!selectedTreeNode &&
              lastSelected && (
                <Tile
                  valueId={lastSelected}
                  value={selectedTreeNode}
                  getDragContext= {handleDragContext}
                  onSelect={handleClickFolder(selectedTreeNode.name)}
                  onRemove={handleRemove}
                  dndType={DRAG_N_DROP_ASSET_KEY}
                />
              )}
        </div>
      </div>
    </>
  )
}

function NodeIcon({ value }: { value?: TreeNode }) {
  if (!value) return null
  if (value.type === 'folder') {
    return <div style={{ marginRight: '4px', marginLeft: '2px', marginTop: '2px' }}><FolderIcon /></div>
  }
  else
  return (
    <>
      <svg style={{ width: '4px', height: '4px' }} />
      <IoIosImage style={{ marginRight: '4px'}} />
    </>
  )
}

export default React.memo(ProjectView)
