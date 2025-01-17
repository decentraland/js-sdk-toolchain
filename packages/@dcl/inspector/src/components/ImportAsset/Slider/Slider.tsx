import { useCallback, useMemo, useState } from 'react'
import { IoIosImage, IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import cx from 'classnames'

import { Button } from '../../Button'
import { Input } from '../../Input'

import { formatFileName, getAssetSize } from '../utils'

import { PropTypes } from './types'

import './Slider.css'

export function Slider({ assets, screenshots }: PropTypes) {
  const [slide, setSlide] = useState(0)
  const manyFiles = assets.length > 1

  const handlePrevClick = useCallback(() => {
    setSlide(Math.max(0, slide - 1))
  }, [slide])

  const handleNextClick = useCallback(() => {
    setSlide(Math.min(assets.length - 1, slide + 1))
  }, [slide])

  const count = useMemo(() => `${slide + 1}/${assets.length}`, [slide, assets])

  if (!assets.length) return null

  return (
    <div className="Slider">
      {manyFiles && <span className="counter">{count}</span>}
      <div className="content">
        {manyFiles && <span className={cx("left", { disabled: slide <= 0 })} onClick={handlePrevClick}><IoIosArrowBack /></span>}
        <div className="slides">
          {assets.map(($, i) => {
            const name = formatFileName($)
            const thumbnail = screenshots.get(name)
            return (
              <div className={cx("asset", { active: slide === i })} key={i}>
                <div>
                  <Thumbnail ext={$.extension} value={thumbnail} />
                  <Input value={name} />
                </div>
                <span className="size">{getAssetSize($)}</span>
              </div>
            )
          })}
        </div>
        {manyFiles && <span className={cx("right", { disabled: slide >= assets.length - 1 })} onClick={handleNextClick}><IoIosArrowForward /></span>}
      </div>
      <Button type="danger" size="big">IMPORT ALL</Button>
    </div>
  )
}

type ThumbnailProps = {
  ext: string
  value?: string
}

function Thumbnail({ ext, value }: ThumbnailProps) {
  if (!value) return <IoIosImage className="thumbnail" />
  switch (ext) {
    case 'gltf':
    case 'png':
    case 'jpg':
      return <img className="thumbnail" src={value} />
    default:
      return <IoIosImage className="thumbnail" />
  }
}
