import { useCallback } from 'react'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import cx from 'classnames'

import { AssetPreview } from '../../AssetPreview'
import { Input } from '../../Input'
import { Loading } from '../../Loading'

import { getAssetSize, getAssetResources } from '../utils'
import { Asset } from '../types'
import { Thumbnails } from './types'

interface AssetSlidesProps {
  uploadedAssets: Asset[]
  currentSlide: number
  screenshots: Thumbnails
  onSlideChange: (newSlide: number) => void
  onScreenshot: (file: Asset) => (thumbnail: string) => void
  onNameChange: (fileIdx: number) => (newName: string) => void
  isNameUnique: (asset: Asset) => boolean
}

export function AssetSlides({
  uploadedAssets,
  currentSlide,
  screenshots,
  onSlideChange,
  onScreenshot,
  onNameChange,
  isNameUnique
}: AssetSlidesProps) {
  const handlePrevClick = useCallback(() => {
    onSlideChange(Math.max(0, currentSlide - 1))
  }, [currentSlide, onSlideChange])

  const handleNextClick = useCallback(() => {
    onSlideChange(Math.min(uploadedAssets.length - 1, currentSlide + 1))
  }, [currentSlide, uploadedAssets.length, onSlideChange])

  const manyAssets = uploadedAssets.length > 1
  const leftArrowDisabled = currentSlide <= 0
  const rightArrowDisabled = currentSlide >= uploadedAssets.length - 1

  const hasEmoteName = (asset: Asset) => {
    return asset.name.endsWith('_emote')
  }

  return (
    <div className="content">
      {manyAssets && (
        <span className={cx('left', { disabled: leftArrowDisabled })} onClick={handlePrevClick}>
          <IoIosArrowBack />
        </span>
      )}
      <div className="slides">
        {uploadedAssets.map(($, i) => (
          <div className={cx('asset', { active: currentSlide === i })} key={i}>
            <div>
              <AssetPreview
                value={$.blob}
                resources={getAssetResources($)}
                onScreenshot={onScreenshot($)}
                isEmote={$.isEmote}
              />
              {screenshots[$.blob.name] ? (
                <div className="thumbnail" style={{ backgroundImage: `url(${screenshots[$.blob.name]})` }}></div>
              ) : (
                <Loading dimmer={false} />
              )}
              <Input value={$.name} onChange={onNameChange(i)} />
              {$.isEmote && !hasEmoteName($) ? (
                <span className="name-error">
                  If you’re trying to upload an emote, please make sure the file name ends in _emote
                </span>
              ) : !isNameUnique($) ? (
                <span className="name-error">Filename already exists</span>
              ) : null}
            </div>
            <span className="size">{getAssetSize($)}</span>
          </div>
        ))}
      </div>
      {manyAssets && (
        <span className={cx('right', { disabled: rightArrowDisabled })} onClick={handleNextClick}>
          <IoIosArrowForward />
        </span>
      )}
    </div>
  )
}
