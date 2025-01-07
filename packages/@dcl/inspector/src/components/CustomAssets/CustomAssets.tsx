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
import { deleteCustomAsset, setAssetToRename } from '../../redux/data-layer'
import { AssetsTab } from '../../redux/ui/types'
import { selectAssetsTab } from '../../redux/ui'

interface CustomAssetItemProps {
  value: CustomAsset
  onDelete: (assetId: string) => void
  onRename: (assetId: string) => void
}

const CustomAssetItem: React.FC<CustomAssetItemProps> = ({ value, onDelete, onRename }) => {
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
      onDelete,
      onRename
    })
  }

  return (
    <>
      <div className="custom-asset-item" onContextMenu={handleContextMenu}>
        <div className="custom-asset-item-box" ref={drag} title={value.name}>
          {value.thumbnail ? <img src={value.thumbnail} alt={value.name} /> : <CustomAssetIcon />}
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

  const handleRename = useCallback(
    (assetId: string) => {
      const asset = customAssets.find((asset) => asset.id === assetId)
      if (!asset) return
      dispatch(setAssetToRename({ assetId: asset.id, name: asset.name }))
      dispatch(selectAssetsTab({ tab: AssetsTab.RenameAsset }))
    },
    [customAssets, dispatch]
  )

  return (
    <div className="custom-assets">
      <CustomAssetContextMenu />
      {customAssets.map((asset) => (
        <CustomAssetItem key={asset.id} value={asset} onDelete={handleDelete} onRename={handleRename} />
      ))}
    </div>
  )
}

export default React.memo(CustomAssets)
