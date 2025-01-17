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
  const manyFiles = assets.length > 1

  const handleScreenshot = useCallback((file: Asset) => (thumbnail: string) => {
    const name = formatFileName(file)
    if (!screenshots[name]) {
      setScreenshots({ ...screenshots, [name]: thumbnail })
    }
  }, [screenshots])

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
  }, [assets, screenshots])

  const countText = useMemo(() => `${slide + 1}/${assets.length}`, [slide, assets])
  const importText = useMemo(() => `IMPORT${manyFiles ? ' ALL' : ''}`, [manyFiles])

  if (!assets.length) return null

  return (
    <div className="Slider">
      {manyFiles && <span className="counter">{countText}</span>}
      <div className="content">
        {manyFiles && <span className={cx("left", { disabled: slide <= 0 })} onClick={handlePrevClick}><IoIosArrowBack /></span>}
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
        {manyFiles && <span className={cx("right", { disabled: slide >= assets.length - 1 })} onClick={handleNextClick}><IoIosArrowForward /></span>}
      </div>
      <Button type="danger" size="big" onSubmit={handleSubmit}>{importText}</Button>
    </div>
  )
}
