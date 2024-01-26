import React, { useCallback } from 'react'
import { AiOutlineSearch as SearchIcon } from 'react-icons/ai'
import { VscChevronLeft as BackIcon } from 'react-icons/vsc'
import { TextField } from '../../ui'
import { Props } from './types'

import './Header.css'

const Header: React.FC<Props> = ({ selectedTheme, search, onChangeTheme, onSearch }) => {
  const handleSearchAssets = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      onSearch(value)
    },
    [onSearch]
  )

  const handleGoBack = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSearch('')
      onChangeTheme()
    },
    [onSearch, onChangeTheme]
  )

  const renderHeaderTitle = useCallback(() => {
    if (!!search) {
      const category = selectedTheme ? ` in ${selectedTheme.name}` : ''
      return `Search Results for '${search}'${category}`
    } else if (!!selectedTheme) {
      return selectedTheme.name
    } else {
      return 'Asset Packs'
    }
  }, [search, selectedTheme])

  const backButton = useCallback(() => {
    if (!search && !selectedTheme) return null

    return <BackIcon className="back-button" size={24} onClick={handleGoBack} />
  }, [search, selectedTheme, handleGoBack])

  const searchPlaceholder = selectedTheme ? `Search ${selectedTheme.name}` : 'Search Asset Packs'

  return (
    <div className="assets-catalog-header">
      <h2 className="assets-catalog-header-title">
        {backButton()}
        {renderHeaderTitle()}
      </h2>
      <div className="assets-catalog-header-search">
        <TextField
          value={search}
          placeholder={searchPlaceholder}
          leftIcon={<SearchIcon />}
          onChange={handleSearchAssets}
          debounceTime={500}
        />
      </div>
    </div>
  )
}

export default React.memo(Header)
