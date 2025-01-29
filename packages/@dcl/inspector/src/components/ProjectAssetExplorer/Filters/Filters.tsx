import { useCallback } from 'react'
import cx from 'classnames'
import { AiOutlineSound as AudioIcon } from 'react-icons/ai'
import { IoIosImage as ImageIcon } from 'react-icons/io'
import { IoCubeOutline as ModelIcon, IoVideocamOutline as VideoIcon } from 'react-icons/io5'
import { FaFile as AssetIcon } from 'react-icons/fa'
import { GoClock as RecentIcon } from 'react-icons/go'

import { PropTypes, Filter } from './types'

import './Filters.css'

export function Filters({ filters, active, onClick }: PropTypes) {
  const getFilter = useCallback((type: Filter) => {
    switch (type) {
      case 'all':
        return { title: 'All Assets', icon: AssetIcon }
      case 'recents':
        return { title: 'Recents', icon: RecentIcon }
      case 'models':
        return { title: 'Models', icon: ModelIcon }
      case 'images':
        return { title: 'Images', icon: ImageIcon }
      case 'audio':
        return { title: 'Audio', icon: AudioIcon }
      case 'video':
        return { title: 'Video', icon: VideoIcon }
      case 'other':
        return { title: 'Other', icon: AssetIcon }
    }
  }, [])

  const handleClick = useCallback((type: Filter) => () => onClick(type), [])

  return (
    <div className="ProjectFilters">
      {filters.map(($) => {
        const _filter = getFilter($)
        return (
          <div className={cx('filter', { active: $ === active })} onClick={handleClick($)}>
            {<_filter.icon />}
            {_filter.title}
          </div>
        )
      })}
    </div>
  )
}
