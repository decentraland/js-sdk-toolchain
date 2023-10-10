import { useMemo, useState } from 'react'
import { useDrag } from 'react-dnd'
import { BsFillLightningChargeFill } from 'react-icons/bs'
import cx from 'classnames'

import { AssetProps, CategoriesProps, Props, ThemeProps } from './types'
import { AssetPack, getAssetsByCategory, getContentsUrl, isSmart } from '../../lib/logic/catalog'

import './AssetsCatalog.css'

export function AssetsCatalog({ catalog }: Props) {
  const [selectedTheme, setSelectedTheme] = useState<AssetPack>()
  const handleThemeChange = (value?: AssetPack) => setSelectedTheme(value)

  if (!catalog) {
    return null
  }

  return (
    <div className="assets-catalog">
      {!selectedTheme && catalog.map(($) => <ThemeCell key={$.id} onClick={handleThemeChange} value={$} />)}
      {selectedTheme && <Categories onGoBack={handleThemeChange} value={selectedTheme} />}
    </div>
  )
}

function ThemeCell({ value, onClick }: ThemeProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(value)
  }

  return (
    <div onClick={handleClick} className="theme" data-test-id={value.id} data-test-label={value.name}>
      <img src={getContentsUrl(value.thumbnail)} alt={value.name} />
      <h4>{value.name}</h4>
      <div></div>
    </div>
  )
}

function Categories({ onGoBack, value }: CategoriesProps) {
  const assetsByCategory = useMemo(() => getAssetsByCategory(value.assets), [value.id, value.assets])
  const handleGoBack = (e: React.MouseEvent) => {
    e.stopPropagation()
    onGoBack()
  }

  return (
    <div className="categories">
      <div>
        <span onClick={handleGoBack}>&lt;</span>
        <h3>{value.name}</h3>
      </div>
      {Array.from(assetsByCategory, ($) => {
        const [category, assets] = $
        if (!assets.length) return null
        return (
          <div className="category" key={category}>
            <h4>{category}</h4>
            <div className="assets">
              {assets.map(($$) => (
                <AssetCell key={$$.id} value={$$} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AssetCell({ value }: AssetProps) {
  const [, drag] = useDrag(() => ({ type: 'builder-asset', item: { value } }), [value])
  const isSmartItem = isSmart(value)
  return (
    <div
      className={cx('asset', { 'smart-item': isSmartItem })}
      ref={drag}
      data-test-id={value.id}
      data-test-label={value.name}
    >
      <img src={getContentsUrl(value.contents['thumbnail.png'])} alt={value.tags.join(', ')} />
      {isSmartItem && SmartItemIcon()}
    </div>
  )
}

function SmartItemIcon() {
  return (
    <div className="smart-item-badge">
      <BsFillLightningChargeFill />
    </div>
  )
}
