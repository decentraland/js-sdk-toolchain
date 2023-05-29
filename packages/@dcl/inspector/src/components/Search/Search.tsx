import React from 'react'

import { Input } from '../Input'
import { PropTypes } from './types'

import './Search.css'
import SearchIcon from '../Icons/Search'

function Search(props: PropTypes) {
  return (
    <div className="Search" onContextMenu={(e) => e.stopPropagation()}>
      <SearchIcon />
      <Input {...props} />
    </div>
  )
}

export default Search
