import React from 'react'

import type { Asset as AssetType } from '../../../lib/logic/catalog'
import { InfoTooltip } from '../../ui'
import { Asset } from '../Asset'
import './Assets.css'

const Assets: React.FC<{ assets: AssetType[] }> = ({ assets }) => {
  return (
    <div className="assets-catalog-assets-container">
      {assets.map(($$) => (
        <InfoTooltip
          key={$$.id}
          text={$$.name}
          trigger={<Asset value={$$} />}
          hideOnScroll={false}
          position="top center"
        />
      ))}
    </div>
  )
}

export default React.memo(Assets)
