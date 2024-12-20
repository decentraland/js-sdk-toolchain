import React from 'react'
import { Item } from 'react-contexify'
import { ContextMenu } from '../../ContexMenu/ContextMenu'
import { CUSTOM_ASSETS_CONTEXT_MENU_ID, CustomAssetContextMenuProps } from './ContextMenu'

export function CustomAssetContextMenu() {
  return (
    <ContextMenu id={CUSTOM_ASSETS_CONTEXT_MENU_ID}>
      <Item
        onClick={({ props }) => {
          const { assetId, onRename } = props as CustomAssetContextMenuProps
          onRename(assetId)
        }}
      >
        Rename
      </Item>
      <Item
        onClick={({ props }) => {
          const { assetId, onDelete } = props as CustomAssetContextMenuProps
          onDelete(assetId)
        }}
      >
        Delete
      </Item>
    </ContextMenu>
  )
}
