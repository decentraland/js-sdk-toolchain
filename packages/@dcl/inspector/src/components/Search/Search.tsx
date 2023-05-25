import React from 'react'

import { Input } from '../Input'
import { PropTypes } from './types'

import './Search.css'
import SearchIcon from '../Icons/Search'

function Search(props: PropTypes) {
  return (
    <div className="Search" onContextMenu={(e) => e.stopPropagation()}>
      <SearchIcon />
      <Input value={props.value} onChange={props.onChange} placeholder={props.placeholder ?? ''} />
    </div>
  )
}

export default Search
