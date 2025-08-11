import React from 'react'

import { type Asset as AssetType } from '../../../lib/logic/catalog'
import { AssetContainer } from '../Asset'

import './Assets.css'

const Assets: React.FC<{ assets: AssetType[] }> = ({ assets }) => {
  return (
    <div className="assets-catalog-assets-container">
      {assets.map((asset) => (
        <AssetContainer key={asset.id} value={asset} />
      ))}
    </div>
  )
}

export default React.memo(Assets)
