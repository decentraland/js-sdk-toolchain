import { useMemo, useState } from 'react'
import { useDrag } from 'react-dnd'

import { AssetProps, CategoriesProps, ITheme, Props, ThemeProps } from './types'
import { getAssetThumbnailUrl, getAssetsByCategory, getThemeThumbnailUrl } from './utils'

import './AssetsCatalog.css'

export function AssetsCatalog({ value }: Props) {
  const [selectedTheme, setSelectedTheme] = useState<ITheme>()
  const handleThemeChange = (value?: ITheme) => setSelectedTheme(value)

  return (
    <div className="assets-catalog">
      {!selectedTheme && value.map(($) => <ThemeCell key={$.id} onClick={handleThemeChange} value={$} />)}
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
    <div onClick={handleClick} className="theme">
      <img src={getThemeThumbnailUrl(value.thumbnail)} alt={value.title}/>
      <h4>{value.title}</h4>
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
      <div><span onClick={handleGoBack}>&lt;</span><h3>{value.title}</h3></div>
      {Array.from(assetsByCategory, ($) => {
        const [category, assets] = $
        if (!assets.length) return null
        return (
          <div className="category" key={category}>
            <h4>{category}</h4>
            <div className="assets">
              {assets.map(($$) => <AssetCell key={$$.id} value={$$} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AssetCell({ value }: AssetProps) {
  const [, drag] = useDrag(() => ({ type: 'asset', item: { asset: value } }), [value])

  return (
    <div ref={drag}>
      <img src={getAssetThumbnailUrl(value.thumbnail)} alt={value.tags.join(', ')}/>
    </div>
  )
}
