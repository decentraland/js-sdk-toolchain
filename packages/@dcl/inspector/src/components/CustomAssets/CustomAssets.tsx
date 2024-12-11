import React from 'react'
import { useDrag } from 'react-dnd'

import './CustomAssets.css'
import { CustomAsset } from '../../lib/logic/catalog'
import CustomAssetIcon from '../Icons/CustomAsset'
import { useAppSelector } from '../../redux/hooks'
import { selectCustomAssets } from '../../redux/app'
import { DropTypesEnum } from '../../lib/sdk/drag-drop'

interface CustomAssetItemProps {
  value: CustomAsset
}

const CustomAssetItem: React.FC<CustomAssetItemProps> = ({ value }) => {
  const [, drag] = useDrag(
    () => ({
      type: DropTypesEnum.CustomAsset,
      item: { value }
    }),
    [value]
  )

  return (
    <>
      <div
        className="custom-asset-item"
        ref={drag}
        data-test-id={value.id}
        data-test-label={value.name}
        title={value.name}
      >
        <CustomAssetIcon /> {value.name}
      </div>
    </>
  )
}

export function CustomAssets() {
  const customAssets = useAppSelector(selectCustomAssets)

  return (
    <div className="custom-assets">
      {customAssets.map((asset) => (
        <CustomAssetItem key={asset.id} value={asset} />
      ))}
    </div>
  )
}

export default React.memo(CustomAssets)
