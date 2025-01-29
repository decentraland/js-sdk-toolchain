import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Entity } from '@dcl/ecs'
import { AiOutlineSound as AudioIcon } from 'react-icons/ai'
import { IoIosImage as ImageIcon } from 'react-icons/io'
import { IoCubeOutline as ModelIcon, IoVideocamOutline as VideoIcon } from 'react-icons/io5'
import { FaFile as OtherIcon } from 'react-icons/fa'

import { useSdk } from '../../hooks/sdk/useSdk'
import { Tile } from './Tile'
import { Tree } from '../Tree'
import { Modal } from '../Modal'
import { Button } from '../Button'
import FolderIcon from '../Icons/Folder'
import { AssetNodeFolder } from './types'
import { getFilterFromTree, getFullNodePath } from './utils'
import Search from '../Search'
import { withAssetDir } from '../../lib/data-layer/host/fs-utils'
import { removeAsset } from '../../redux/data-layer'
import { useAppDispatch } from '../../redux/hooks'
import { determineAssetType, extractFileExtension } from '../ImportAsset/utils'
import { generateAssetTree, getChildren as _getChildren, TreeNode, ROOT, getTiles } from './tree'
import { Filters } from './Filters'
import { Filter } from './Filters/types'

export { TreeNode }

function noop() {}

type Props = {
  folders: AssetNodeFolder[]
  thumbnails: { path: string; content: Uint8Array }[]
}

interface ModalState {
  isOpen: boolean
  value: string
  entities: Entity[]
}

export const DRAG_N_DROP_ASSET_KEY = 'local-asset'

const FilesTree = Tree<string>()

function ProjectView({ folders, thumbnails }: Props) {
  const sdk = useSdk()
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(new Set<string>())
  const [modal, setModal] = useState<ModalState | undefined>(undefined)
  const [lastSelected, setLastSelected] = useState<string>(ROOT)
  const [search, setSearch] = useState<string>('')
  const [tree, setTree] = useState<Map<string, TreeNode>>(new Map())
  const [filters, setFilters] = useState<Filter[]>([])
  const [activeFilter, setActiveFilter] = useState<Filter>('all')

  useEffect(() => {
    const { tree, filters } = generateAssetTree(folders, open, search, activeFilter)
    setTree(tree)
    setFilters(getFilterFromTree(filters))
  }, [folders, search, activeFilter])

  /**
   * Callbacks
   */

  const onSelect = useCallback(
    (value: string) => {
      open.add(value)
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
      dispatch(removeAsset({ path }))
    },
    [open, setOpen, lastSelected]
  )

  const handleConfirm = useCallback(async () => {
    if (!modal) return
    dispatch(removeAsset({ path: modal.value }))
    setModal(undefined)
  }, [modal, setModal])

  const handleModalClose = useCallback(() => setModal(undefined), [])

  const handleClickFolder = useCallback(
    (node: TreeNode) => () => {
      if (node.type === 'asset') return
      const path = getFullNodePath(node).slice(1)
      open.add(path)
      setLastSelected(path)
    },
    [setLastSelected]
  )
  const handleDragContext = useCallback(() => ({ tree }), [tree])
  const isOpen = useCallback((val: string) => open.has(val), [open])

  const getChildren = useCallback(
    (val: string) => {
      const childs = _getChildren(val, tree, search, activeFilter)
      return childs
    },
    [tree, search, activeFilter]
  )

  const getThumbnail = useCallback(
    (value: string) => {
      const [name] = value.split('.')
      const thumbnail = thumbnails.find(($) => $.path.endsWith(name + '.png'))
      if (thumbnail) return thumbnail.content
    },
    [thumbnails]
  )

  const handleFilterClick = useCallback((type: Filter) => {
    setActiveFilter(type)
  }, [])

  const tiles = getTiles(lastSelected, tree, search, activeFilter)

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
        <Filters filters={filters} active={activeFilter} onClick={handleFilterClick} />
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
            onDrop={noop}
            onRemove={handleRemove}
            onRename={noop}
            onSelect={onSelect}
            onDoubleSelect={noop}
            onSetOpen={onSetOpen}
            onDuplicate={noop}
            getId={(value: string) => value.toString()}
            getChildren={getChildren}
            getLabel={(val: string) => <span>{tree.get(val)?.name ?? val}</span>}
            isOpen={isOpen}
            isSelected={(val: string) => lastSelected === val}
            isHidden={(val: string) => val === ROOT}
            canRename={() => false}
            canRemove={(val) => tree.get(val)?.type === 'asset'}
            canDuplicate={() => false}
            canAddChild={() => false}
            getIcon={(val) => <NodeIcon value={tree.get(val)} />}
            getDragContext={handleDragContext}
            dndType={DRAG_N_DROP_ASSET_KEY}
          />
        </div>
        <div className="FolderView">
          {tiles.map((node) => (
            <Tile
              key={node.name}
              valueId={getFullNodePath(node).slice(1)}
              value={node}
              getDragContext={handleDragContext}
              onSelect={handleClickFolder(node)}
              onRemove={handleRemove}
              getThumbnail={getThumbnail}
              dndType={DRAG_N_DROP_ASSET_KEY}
            />
          ))}
        </div>
      </div>
    </>
  )
}

function NodeIcon({ value }: { value?: TreeNode }) {
  if (!value) return null
  if (value.type === 'folder') {
    return (
      <div style={{ marginRight: '4px', marginLeft: '2px', marginTop: '2px' }}>
        <FolderIcon />
      </div>
    )
  } else {
    const Icon = useMemo(() => {
      const classification = determineAssetType(extractFileExtension(value.name)[1])
      switch (classification) {
        case 'Models':
          return ModelIcon
        case 'Images':
          return ImageIcon
        case 'Audio':
          return AudioIcon
        case 'Video':
          return VideoIcon
        case 'Other':
          return OtherIcon
      }
    }, [])

    return (
      <>
        <svg style={{ width: '4px', height: '4px' }} />
        <Icon style={{ marginRight: '4px' }} />
      </>
    )
  }
}

export default React.memo(ProjectView)
