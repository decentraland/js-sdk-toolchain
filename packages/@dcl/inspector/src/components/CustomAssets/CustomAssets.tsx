import React from 'react'
import { useDrag } from 'react-dnd'

import './CustomAssets.css'
import { AssetData } from '../../lib/logic/catalog'
import CustomAssetIcon from '../Icons/CustomAsset'
import { useAppSelector } from '../../redux/hooks'
import { selectCustomAssets } from '../../redux/app'

interface CustomAssetItemProps {
  value: AssetData
}

const CustomAssetItem: React.FC<CustomAssetItemProps> = ({ value }) => {
  const [, drag] = useDrag(
    () => ({
      type: 'custom-asset',
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
