import { contextMenu } from 'react-contexify'
import 'react-contexify/dist/ReactContexify.css'

export const CUSTOM_ASSETS_CONTEXT_MENU_ID = 'custom-assets-context-menu'

export type CustomAssetContextMenuProps = {
  assetId: string
  onDelete: (assetId: string) => void
  onRename: (assetId: string) => void
}

export function openCustomAssetContextMenu(event: React.MouseEvent, props: CustomAssetContextMenuProps) {
  event.preventDefault()
  contextMenu.show({
    id: CUSTOM_ASSETS_CONTEXT_MENU_ID,
    event,
    props: {
      ...props,
      onDelete: (assetId: string) => {
        props.onDelete(assetId)
      },
      onRename: (assetId: string) => {
        props.onRename(assetId)
      }
    }
  })
}
