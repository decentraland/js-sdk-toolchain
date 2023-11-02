import { useCallback } from 'react'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { IoIosImage } from 'react-icons/io'
import { Item as MenuItem } from 'react-contexify'
import { useDrag } from 'react-dnd'

import { transformBinaryToBase64Resource } from '../../../lib/data-layer/host/fs-utils'
import { ContextMenu as Menu } from '../../ContexMenu'
import FolderIcon from '../../Icons/Folder'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { Props } from './types'

import './Tile.css'

export const Tile = withContextMenu<Props>(
  ({ valueId, value, getDragContext, onSelect, onRemove, contextMenuId, dndType, getThumbnail }) => {
    const { handleAction } = useContextMenu()

    const [, drag] = useDrag(() => ({ type: dndType, item: { value: valueId, context: getDragContext() } }), [valueId])

    const handleRemove = useCallback(() => {
      onRemove(valueId)
    }, [valueId])

    if (!value) return null

    const renderThumbnail = () => {
      if (value.type === 'folder') return <FolderIcon />
      const thumbnail = getThumbnail(value.name)
      if (thumbnail) return <img src={transformBinaryToBase64Resource(thumbnail)} alt={value.name} />
      return <IoIosImage />
    }

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
          {renderThumbnail()}
          <span>{value.name}</span>
        </div>
      </>
    )
  }
)
