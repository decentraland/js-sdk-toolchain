import React, { useCallback, useMemo, useState } from 'react'

import { AssetPack } from '../../lib/logic/catalog'
import { useAppDispatch } from '../../redux/hooks'
import { selectAssetsTab } from '../../redux/ui'
import { AssetsTab } from '../../redux/ui/types'

import { Header } from './Header'
import { Themes } from './Themes'
import { Categories } from './Categories'
import { Assets } from './Assets'

import { Props } from './types'

import './AssetsCatalog.css'

const AssetsCatalog: React.FC<Props> = ({ catalog }) => {
  const dispatch = useAppDispatch()
  const [selectedTheme, setSelectedTheme] = useState<AssetPack>()
  const [search, setSearch] = useState<string>('')

  const handleThemeChange = useCallback((value?: AssetPack) => setSelectedTheme(value), [setSelectedTheme])

  const handleUploadAsset = useCallback(() => {
    dispatch(selectAssetsTab({ tab: AssetsTab.Import }))
  }, [])

  const handleSearchAssets = useCallback(
    (value: string) => {
      setSearch(value)
    },
    [setSearch]
  )

  const filteredCatalog = useMemo(() => {
    const results = []
    if (search) {
      if (selectedTheme) {
        for (const asset of selectedTheme.assets) {
          if (asset.name.toLowerCase().includes(search.toLowerCase())) {
            results.push(asset)
          }
        }
      } else {
        for (const theme of catalog) {
          for (const asset of theme.assets) {
            if (asset.name.toLowerCase().includes(search.toLowerCase())) {
              results.push(asset)
            }
          }
        }
      }
    }

    return results
  }, [catalog, selectedTheme, search])

  const renderEmptySearch = useCallback(() => {
    const ctaMethod = selectedTheme ? handleThemeChange : handleUploadAsset
    const ctaText = selectedTheme ? 'search all categories' : 'upload your own asset'
    return (
      <div className="empty-search">
        <span>No results for '{search}'.</span>
        <span>
          Try using another words or{' '}
          <span className="empty-search-cta" onClick={() => ctaMethod()}>
            {ctaText}
          </span>
          .
        </span>
      </div>
    )
  }, [search, selectedTheme, handleThemeChange, handleUploadAsset])

  const renderAssets = useCallback(() => {
    if (filteredCatalog.length > 0) {
      return <Assets assets={filteredCatalog} />
    }

    return renderEmptySearch()
  }, [filteredCatalog])

  if (!catalog) {
    return null
  }

  return (
    <div className="assets-catalog">
      <Header selectedTheme={selectedTheme} onChangeTheme={handleThemeChange} onSearch={handleSearchAssets} />
      {search ? (
        renderAssets()
      ) : selectedTheme ? (
        <Categories onGoBack={handleThemeChange} value={selectedTheme} />
      ) : (
        <Themes catalog={catalog} onClick={handleThemeChange} />
      )}
    </div>
  )
}

export default React.memo(AssetsCatalog)
