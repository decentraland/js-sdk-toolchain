import React, { useEffect } from 'react'
import { useDrag, DragPreviewImage } from 'react-dnd'
import cx from 'classnames'
import { BsFillLightningChargeFill as SmartItemIcon } from 'react-icons/bs'

import { getContentsUrl, isSmart, isGround } from '../../../lib/logic/catalog'
import { Asset } from '../../../lib/logic/catalog'
import './Asset.css'

import { fetchImage, resizeImage } from '../../../lib/utils/img'
import { useIsMounted } from '../../../hooks/useIsMounted'

const Asset: React.FC<{ value: Asset }> = ({ value }) => {
  const [, drag, preview] = useDrag(() => ({ type: 'builder-asset', item: { value } }), [value])
  const isSmartItem = isSmart(value)
  const isGroundItem = isGround(value)
  const imgSrc = getContentsUrl(value.contents['thumbnail.png'])

  // generate drag preview as a 60x60 data url image
  const [previewImg, setPreviewImg] = React.useState<string>()
  const isMounted = useIsMounted()
  useEffect(() => {
    void fetchImage(`${imgSrc}?resize`)
      .then((img) => resizeImage(img, 60, 60))
      .then((canvas) => isMounted() && setPreviewImg(canvas.toDataURL()))
  }, [imgSrc, setPreviewImg, isMounted])

  return (
    <>
      {previewImg && <DragPreviewImage connect={preview} src={previewImg} />}
      <div
        className={cx('assets-catalog-asset', { 'smart-item': isSmartItem, ground: isGroundItem })}
        ref={drag}
        data-test-id={value.id}
        data-test-label={value.name}
        title={value.name}
      >
        <img src={imgSrc} alt={value.tags.join(', ')} />
        {isSmartItem && (
          <div className="smart-item-badge item-badge">
            <SmartItemIcon />
          </div>
        )}
        {isGroundItem && <div className="ground-badge  item-badge"></div>}
      </div>
    </>
  )
}

export default React.memo(Asset)
