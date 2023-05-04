import { Item } from 'react-contexify'
import { AiOutlineFileAdd } from 'react-icons/ai'
import { IoIosImage } from 'react-icons/io'

import { useContextMenu } from '../../hooks/sdk/useContextMenu'
import { ROOT, TreeNode } from './ProjectView'

interface Props {
  value: TreeNode | undefined
  onImportAsset(): void
}

function ContextMenu({ value, onImportAsset }: Props) {
  const { handleAction } = useContextMenu()

  if (value?.type === 'asset') return null

  return (
    <>
      <Item id="new-asset-pack" onClick={handleAction(onImportAsset)}>
        <AiOutlineFileAdd /> Import new asset
      </Item>
      <Item hidden={true || value?.name === ROOT} id="new-asset-texture" onClick={handleAction(onImportAsset)}>
        <IoIosImage /> Import texture
      </Item>
    </>
  )
}

export default ContextMenu
