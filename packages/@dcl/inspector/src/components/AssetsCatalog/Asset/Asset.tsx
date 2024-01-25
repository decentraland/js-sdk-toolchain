import React from 'react'
import { useDrag } from 'react-dnd'
import cx from 'classnames'
import { BsFillLightningChargeFill as SmartItemIcon } from 'react-icons/bs'

import { getContentsUrl, isSmart } from '../../../lib/logic/catalog'
import { Asset } from '../../../lib/logic/catalog'

import './Asset.css'

const Asset: React.FC<{ value: Asset }> = ({ value }) => {
  const [, drag] = useDrag(() => ({ type: 'builder-asset', item: { value } }), [value])
  const isSmartItem = isSmart(value)
  return (
    <div
      className={cx('assets-catalog-asset', { 'smart-item': isSmartItem })}
      ref={drag}
      data-test-id={value.id}
      data-test-label={value.name}
      title={value.name}
    >
      <img src={getContentsUrl(value.contents['thumbnail.png'])} alt={value.tags.join(', ')} />
      {isSmartItem && (
        <div className="smart-item-badge">
          <SmartItemIcon />
        </div>
      )}
    </div>
  )
}

export default React.memo(Asset)
