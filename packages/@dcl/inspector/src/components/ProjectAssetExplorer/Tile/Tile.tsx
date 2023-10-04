import { useCallback } from 'react'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { IoIosImage } from 'react-icons/io'
import { Item as MenuItem } from 'react-contexify'
import { useDrag } from 'react-dnd'

import { ContextMenu as Menu } from '../../ContexMenu'
import FolderIcon from '../../Icons/Folder'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { Props } from './types'

import './Tile.css'

export const Tile = withContextMenu<Props>(
  ({ valueId, value, getDragContext, onSelect, onRemove, contextMenuId, dndType }) => {
    const { handleAction } = useContextMenu()

    const [, drag] = useDrag(() => ({ type: dndType, item: { value: valueId, context: getDragContext() } }), [valueId])

    const handleRemove = useCallback(() => {
      onRemove(valueId)
    }, [valueId])

    if (!value) return null

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
          {value.type === 'folder' ? <FolderIcon /> : <IoIosImage />}
          <span>{value.name}</span>
        </div>
      </>
    )
  }
)