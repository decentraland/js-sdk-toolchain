import React from 'react'
import { getContentsUrl } from '../../../lib/logic/catalog'
import { Props } from './types'
import './Themes.css'

const Themes: React.FC<Props> = ({ catalog, onClick }) => {
  return (
    <div className="asset-catalog-themes">
      {catalog.map((value) => (
        <div
          key={value.id}
          className="theme"
          data-test-id={value.id}
          data-test-label={value.name}
          onClick={() => onClick(value)}
        >
          <img src={getContentsUrl(value.thumbnail)} alt={value.name} />
          <div className="theme-info">
            <h4 className="theme-info-name">{value.name}</h4>
            <div className="theme-info-items">{value.assets.length} items</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default React.memo(Themes)
