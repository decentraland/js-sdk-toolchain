import React, { useCallback } from 'react'
import { useDrag } from 'react-dnd'

import './CustomAssets.css'
import { CustomAsset } from '../../lib/logic/catalog'
import CustomAssetIcon from '../Icons/CustomAsset'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { selectCustomAssets } from '../../redux/app'
import { DropTypesEnum } from '../../lib/sdk/drag-drop'
import { CustomAssetContextMenu } from './ContextMenu/CustomAssetContextMenu'
import { openCustomAssetContextMenu } from './ContextMenu/ContextMenu'
import { deleteCustomAsset } from '../../redux/data-layer'

interface CustomAssetItemProps {
  value: CustomAsset
  onDelete: (assetId: string) => void
}

const CustomAssetItem: React.FC<CustomAssetItemProps> = ({ value, onDelete }) => {
  const [, drag] = useDrag(
    () => ({
      type: DropTypesEnum.CustomAsset,
      item: { value }
    }),
    [value]
  )

  const handleContextMenu = (event: React.MouseEvent) => {
    openCustomAssetContextMenu(event, {
      assetId: value.id,
      onDelete
    })
  }

  return (
    <>
      <div className="custom-asset-item" onContextMenu={handleContextMenu}>
        <div className="custom-asset-item-box" ref={drag} title={value.name}>
          <CustomAssetIcon />
        </div>
        <span className="custom-asset-item-label">{value.name}</span>
      </div>
    </>
  )
}

export function CustomAssets() {
  const customAssets = useAppSelector(selectCustomAssets)
  const dispatch = useAppDispatch()

  const handleDelete = useCallback((assetId: string) => {
    dispatch(deleteCustomAsset({ assetId }))
  }, [])

  return (
    <div className="custom-assets">
      <CustomAssetContextMenu />
      {customAssets.map((asset) => (
        <CustomAssetItem key={asset.id} value={asset} onDelete={handleDelete} />
      ))}
    </div>
  )
}

export default React.memo(CustomAssets)
