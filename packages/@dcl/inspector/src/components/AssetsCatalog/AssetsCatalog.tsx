import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { AssetPack } from '../../lib/logic/catalog'
import { analytics, Event } from '../../lib/logic/analytics'
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
    if (!search) return []

    const searchLower = search.toLowerCase()
    const assets = selectedTheme ? selectedTheme.assets : catalog.flatMap((theme) => theme.assets)

    const { starts, includes } = assets.reduce(
      (results: { starts: AssetPack['assets']; includes: AssetPack['assets'] }, asset) => {
        const name = asset.name.toLowerCase()
        if (name.split(' ').some((word) => word.startsWith(searchLower))) results.starts.push(asset)
        if (name.includes(searchLower)) results.includes.push(asset)
        return results
      },
      { starts: [], includes: [] }
    )

    return starts.length ? starts : includes
  }, [catalog, selectedTheme, search])

  useEffect(() => {
    if (search) {
      analytics.track(Event.SEARCH_ITEM, {
        keyword: search,
        itemsFound: filteredCatalog.length,
        category: selectedTheme?.name
      })
    }
  }, [search, filteredCatalog])

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
      <Header
        search={search}
        selectedTheme={selectedTheme}
        onChangeTheme={handleThemeChange}
        onSearch={handleSearchAssets}
      />
      {search ? (
        renderAssets()
      ) : selectedTheme ? (
        <Categories onGoBack={handleThemeChange} value={selectedTheme} />
      ) : (
        <div className="assets-catalog-theme-container">
          <Themes catalog={catalog} onClick={handleThemeChange} />
        </div>
      )}
    </div>
  )
}

export default React.memo(AssetsCatalog)
