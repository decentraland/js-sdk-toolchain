import React from 'react'
import { Menu, Item } from 'react-contexify'
import { MdOutlineDriveFileRenameOutline as RenameIcon } from 'react-icons/md'
import { AiFillFileAdd as AddChildIcon, AiFillDelete as DeleteIcon, AiFillCopy as DuplicateIcon } from 'react-icons/ai'

import { useContextMenu } from '../../../hooks/sdk/useContextMenu'

export interface Props {
  id: string
  enableAdd?: boolean
  enableEdit?: boolean
  enableRemove?: boolean
  enableDuplicate?: boolean
  onAddChild: () => void
  onEdit: () => void
  onRemove: () => void
  onDuplicate: () => void
  extra?: JSX.Element | null
}

function ContextMenu({
  id,
  enableAdd = true,
  enableEdit = true,
  enableRemove = true,
  enableDuplicate = true,
  onAddChild,
  onEdit,
  onRemove,
  onDuplicate,
  extra
}: Props) {
  const { handleAction } = useContextMenu()
  const someActionIsEnabled = enableAdd || enableEdit || enableRemove || enableDuplicate

  if (!someActionIsEnabled && !extra) return null

  return (
    <Menu id={id}>
      <Item hidden={!enableEdit} id="rename" onClick={handleAction(onEdit)}>
        <RenameIcon /> Rename
      </Item>
      <Item hidden={!enableAdd} id="add-child" onClick={handleAction(onAddChild)}>
        <AddChildIcon /> Add child
      </Item>
      <Item hidden={!enableDuplicate} id="duplicate" onClick={handleAction(onDuplicate)}>
        <DuplicateIcon /> Duplicate
      </Item>
      <Item hidden={!enableRemove} id="delete" onClick={handleAction(onRemove)}>
        <DeleteIcon /> Delete
      </Item>
      {extra}
    </Menu>
  )
}

export default React.memo(ContextMenu)
