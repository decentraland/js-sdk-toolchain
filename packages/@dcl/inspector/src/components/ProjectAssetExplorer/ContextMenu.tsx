import React from 'react'
import { Item } from 'react-contexify'
import { AiOutlineFileAdd } from 'react-icons/ai'
import { IoIosImage } from 'react-icons/io'

import { useContextMenu } from '../../hooks/sdk/useContextMenu'
import { ROOT, TreeNode } from './ProjectView'

function ContextMenu({ value, onImportAsset }: { value: TreeNode | undefined; onImportAsset(): void }) {
  const { handleAction } = useContextMenu()

  return (
    <>
      <Item hidden={false} id="new-asset-pack" onClick={handleAction(onImportAsset)}>
        <AiOutlineFileAdd /> Import new asset
      </Item>
      <Item hidden={true || value?.name === ROOT} id="new-asset-texture" onClick={handleAction(onImportAsset)}>
        <IoIosImage /> Import texture
      </Item>
    </>
  )
}

export default ContextMenu
