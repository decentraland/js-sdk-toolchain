import { useCallback, useMemo } from 'react'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { IoIosImage } from 'react-icons/io'
import { Item as MenuItem } from 'react-contexify'
import { useDrag } from 'react-dnd'
import { Loader } from 'decentraland-ui/dist/components/Loader/Loader'

import { transformBinaryToBase64Resource, withAssetDir } from '../../../lib/data-layer/host/fs-utils'
import { useAppSelector } from '../../../redux/hooks'
import { selectDataLayerRemovingAsset } from '../../../redux/data-layer'
import { ContextMenu as Menu } from '../../ContexMenu'
import FolderIcon from '../../Icons/Folder'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { Props } from './types'

import './Tile.css'

export const Tile = withContextMenu<Props>(
  ({ valueId, value, getDragContext, onSelect, onRemove, contextMenuId, dndType, getThumbnail }) => {
    const { handleAction } = useContextMenu()
    const isRemovingAsset = useAppSelector(selectDataLayerRemovingAsset)

    const isLoading = useMemo(() => {
      const path = withAssetDir(valueId)
      return !!isRemovingAsset[path]
    }, [valueId, isRemovingAsset])

    const [, drag] = useDrag(() => ({ type: dndType, item: { value: valueId, context: getDragContext() } }), [valueId])

    const handleRemove = useCallback(() => {
      onRemove(valueId)
    }, [valueId])

    if (!value) return null

    const renderThumbnail = useCallback(() => {
      if (value.type === 'folder') return <FolderIcon />
      const thumbnail = getThumbnail(value.name)
      if (thumbnail) return <img src={transformBinaryToBase64Resource(thumbnail)} alt={value.name} />
      return <IoIosImage />
    }, [])

    const renderOverlayLoading = useCallback(() => {
      if (isLoading) {
        return (
          <div className="overlay">
            <Loader active />
          </div>
        )
      }

      return null
    }, [isLoading])

    return (
      <>
        {/* TODO: support removing folders */}
        {value.type === 'asset' && (
          <Menu id={contextMenuId}>
            <MenuItem id="delete" onClick={handleAction(handleRemove)}>
              <DeleteIcon /> Delete
            </MenuItem>
          </Menu>
        )}
        <div
          ref={drag}
          className="Tile"
          key={value.name}
          onDoubleClick={onSelect}
          title={value.name}
          data-test-id={valueId}
          data-test-label={value.name}
        >
          {renderOverlayLoading()}
          {renderThumbnail()}
          <span>{value.name}</span>
        </div>
      </>
    )
  }
)
