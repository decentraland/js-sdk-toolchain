import React, { useMemo } from 'react'
import { getAssetsByCategory } from '../../../lib/logic/catalog'
import { Assets } from '../Assets'
import { Props } from './types'
import './Categories.css'

const Categories: React.FC<Props> = ({ value }) => {
  const assetsByCategory = useMemo(() => getAssetsByCategory(value.assets), [value.id, value.assets])

  return (
    <div className="assets-catalog-categories">
      {Array.from(assetsByCategory, ($) => {
        const [category, assets] = $
        if (!assets.length) return null
        return (
          <div className="assets-catalog-category" key={category}>
            <h4 className="category-name">{category}</h4>
            <Assets assets={assets} />
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(Categories)
