import { useCallback, useMemo, useState } from 'react'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import cx from 'classnames'

import { AssetPreview } from '../../AssetPreview'
import { Button } from '../../Button'
import { Input } from '../../Input'

import { getAssetSize, getAssetResources, determineAssetType, formatFileName } from '../utils'

import { Asset } from '../types'
import { PropTypes, Thumbnails } from './types'

import './Slider.css'

export function Slider({ assets, onSubmit, isNameValid }: PropTypes) {
  const [value, setValue] = useState(assets)
  const [slide, setSlide] = useState(0)
  const [screenshots, setScreenshots] = useState<Thumbnails>({})

  const handleScreenshot = useCallback(
    (file: Asset) => (thumbnail: string) => {
      const { name } = file.blob
      if (!screenshots[name]) {
        setScreenshots(($) => ({ ...$, [name]: thumbnail }))
      }
    },
    [screenshots]
  )

  const handlePrevClick = useCallback(() => {
    setSlide(Math.max(0, slide - 1))
  }, [slide])

  const handleNextClick = useCallback(() => {
    setSlide(Math.min(value.length - 1, slide + 1))
  }, [slide])

  const handleNameChange = useCallback(
    (fileIdx: number) => (newName: string) => {
      setValue(
        value.map(($, i) => {
          if (fileIdx !== i) return $
          return { ...$, name: newName }
        })
      )
    },
    [value]
  )

  const handleSubmit = useCallback(() => {
    onSubmit(
      value.map(($) => ({
        ...$,
        thumbnail: screenshots[$.blob.name]
      }))
    )
  }, [value, screenshots])

  const manyAssets = useMemo(() => value.length > 1, [value])
  const countText = useMemo(() => `${slide + 1}/${value.length}`, [slide, value])
  const importText = useMemo(() => `IMPORT${manyAssets ? ' ALL' : ''}`, [manyAssets])
  const leftArrowDisabled = useMemo(() => slide <= 0, [slide])
  const rightArrowDisabled = useMemo(() => slide >= value.length - 1, [slide, value])
  const allScreenshotsTaken = useMemo(() => {
    const neededScreenshots = value.filter(($) => {
      const type = determineAssetType($.extension)
      return type === 'Models' || type === 'Images'
    })
    return neededScreenshots.length === Object.keys(screenshots).length
  }, [value, screenshots])

  const invalidNames = useMemo(() => {
    const all = new Set<string>()
    const invalid = new Set<string>()

    for (const asset of value) {
      const name = formatFileName(asset)
      if (all.has(name) || !isNameValid(asset, name)) {
        invalid.add(name)
      } else {
        all.add(name)
      }
    }

    return invalid
  }, [value])

  const isNameUnique = useCallback(
    (asset: Asset) => {
      const name = formatFileName(asset)
      return !invalidNames.has(name)
    },
    [invalidNames]
  )

  if (!value.length) return null

  return (
    <div className="Slider">
      {manyAssets && <span className="counter">{countText}</span>}
      <div className="content">
        {manyAssets && (
          <span className={cx('left', { disabled: leftArrowDisabled })} onClick={handlePrevClick}>
            <IoIosArrowBack />
          </span>
        )}
        <div className="slides">
          {value.map(($, i) => (
            <div className={cx('asset', { active: slide === i })} key={i}>
              <div>
                <AssetPreview value={$.blob} resources={getAssetResources($)} onScreenshot={handleScreenshot($)} />
                <Input value={$.name} onChange={handleNameChange(i)} />
                {!isNameUnique($) && <span className="name-error">Filename already exists</span>}
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
      <Button type="danger" size="big" onClick={handleSubmit} disabled={!allScreenshotsTaken || invalidNames.size > 0}>
        {importText}
      </Button>
    </div>
  )
}
