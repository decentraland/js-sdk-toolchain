import { useCallback, useMemo, useState } from 'react'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import cx from 'classnames'

import { AssetPreview } from '../../AssetPreview'
import { Button } from '../../Button'
import { Input } from '../../Input'

import { formatFileName, getAssetSize, getAssetResources } from '../utils'

import { Asset } from '../types'
import { PropTypes, Thumbnails } from './types'

import './Slider.css'

export function Slider({ assets, onSubmit }: PropTypes) {
  const [slide, setSlide] = useState(0)
  const [screenshots, setScreenshots] = useState<Thumbnails>({})

  const handleScreenshot = (file: Asset) => (thumbnail: string) => {
    const name = formatFileName(file)
    if (!screenshots[name]) {
      setScreenshots((value) => ({ ...value, [name]: thumbnail }))
    }
  }

  const handlePrevClick = useCallback(() => {
    setSlide(Math.max(0, slide - 1))
  }, [slide])

  const handleNextClick = useCallback(() => {
    setSlide(Math.min(assets.length - 1, slide + 1))
  }, [slide])

  const handleSubmit = useCallback(() => {
    onSubmit(assets.map(($) => ({
      ...$,
      thumbnail: screenshots[formatFileName($)]
    })))
  }, [screenshots])

  const manyAssets = useMemo(() => assets.length > 1, [assets])
  const countText = useMemo(() => `${slide + 1}/${assets.length}`, [slide, assets])
  const importText = useMemo(() => `IMPORT${manyAssets ? ' ALL' : ''}`, [manyAssets])
  const leftArrowDisabled = useMemo(() => slide <= 0, [slide])
  const rightArrowDisabled = useMemo(() => slide >= assets.length - 1, [slide, assets])

  if (!assets.length) return null

  return (
    <div className="Slider">
      {manyAssets && <span className="counter">{countText}</span>}
      <div className="content">
        {manyAssets && <span className={cx("left", { disabled: leftArrowDisabled })} onClick={handlePrevClick}><IoIosArrowBack /></span>}
        <div className="slides">
          {assets.map(($, i) => (
            <div className={cx("asset", { active: slide === i })} key={i}>
              <div>
                <AssetPreview value={$.blob} resources={getAssetResources($)} onScreenshot={handleScreenshot($)} />
                <Input value={formatFileName($)} />
              </div>
              <span className="size">{getAssetSize($)}</span>
            </div>
          ))}
        </div>
        {manyAssets && <span className={cx("right", { disabled: rightArrowDisabled })} onClick={handleNextClick}><IoIosArrowForward /></span>}
      </div>
      <Button type="danger" size="big" onClick={handleSubmit}>{importText}</Button>
    </div>
  )
}
