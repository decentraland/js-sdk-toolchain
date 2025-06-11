import { useCallback, useMemo, useState } from 'react'

import { Button } from '../../Button'
import { AssetSlides } from './AssetSlides'

import { determineAssetType, formatFileName } from '../utils'

import { Asset } from '../types'
import { PropTypes, Thumbnails } from './types'

import './Slider.css'

export function Slider({ assets, onSubmit, isNameValid }: PropTypes) {
  const [uploadedAssets, setUploadedAssets] = useState(assets)
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

  const handleNameChange = useCallback(
    (fileIdx: number) => (newName: string) => {
      setUploadedAssets(
        uploadedAssets.map(($, i) => {
          if (fileIdx !== i) return $
          return { ...$, name: newName }
        })
      )
    },
    [uploadedAssets]
  )

  const handleSubmit = useCallback(() => {
    onSubmit(
      uploadedAssets.map(($) => ({
        ...$,
        thumbnail: screenshots[$.blob.name]
      }))
    )
  }, [uploadedAssets, screenshots])

  const manyAssets = useMemo(() => uploadedAssets.length > 1, [uploadedAssets])
  const countText = useMemo(() => `${slide + 1}/${uploadedAssets.length}`, [slide, uploadedAssets])
  const importText = useMemo(
    () => `IMPORT${manyAssets ? ` ALL (${uploadedAssets.length})` : ''}`,
    [manyAssets, uploadedAssets.length]
  )

  const allScreenshotsTaken = useMemo(() => {
    const neededScreenshots = uploadedAssets.filter(($) => {
      const type = determineAssetType($.extension)
      return type === 'Models' || type === 'Images'
    })
    return neededScreenshots.length === Object.keys(screenshots).length
  }, [uploadedAssets, screenshots])

  const invalidNames = useMemo(() => {
    const all = new Set<string>()
    const invalid = new Set<string>()

    for (const asset of uploadedAssets) {
      const name = formatFileName(asset)
      if (all.has(name) || !isNameValid(asset, name)) {
        invalid.add(name)
      } else {
        all.add(name)
      }
    }

    return invalid
  }, [uploadedAssets])

  const isNameUnique = useCallback(
    (asset: Asset) => {
      const name = formatFileName(asset)
      return !invalidNames.has(name)
    },
    [invalidNames]
  )

  if (!uploadedAssets.length) return null

  return (
    <div className="Slider">
      {manyAssets && <span className="counter">{countText}</span>}
      <AssetSlides
        uploadedAssets={uploadedAssets}
        currentSlide={slide}
        screenshots={screenshots}
        onSlideChange={setSlide}
        onScreenshot={handleScreenshot}
        onNameChange={handleNameChange}
        isNameUnique={isNameUnique}
      />
      <Button type="danger" size="big" onClick={handleSubmit} disabled={!allScreenshotsTaken || invalidNames.size > 0}>
        {importText}
      </Button>
    </div>
  )
}
