import { useMemo, useState } from 'react'
import { useDrag } from 'react-dnd'

import { Loading } from '../Loading'

import { AssetProps, CategoriesProps, AssetPack, Props, ThemeProps } from './types'
import { getContentsUrl, getAssetsByCategory } from './utils'

import './AssetsCatalog.css'

export function AssetsCatalog({ catalog, error, isLoading }: Props) {
  const [selectedTheme, setSelectedTheme] = useState<AssetPack>()
  const handleThemeChange = (value?: AssetPack) => setSelectedTheme(value)

  if (error) {
    return (
      <div className="assets-catalog">
        <div className="error">{error.message}</div>
      </div>
    )
  }

  if (isLoading) {
    return <Loading dimmer={false} />
  }

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

  return (
    <div className="asset" ref={drag} data-test-id={value.id} data-test-label={value.name}>
      <img src={getContentsUrl(value.contents['thumbnail.png'])} alt={value.tags.join(', ')} />
    </div>
  )
}
