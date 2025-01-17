import * as React from 'react'
import { PreviewCamera, PreviewProjection } from '@dcl/schemas'
import { WearablePreview } from 'decentraland-ui'
import { IoIosImage } from 'react-icons/io'

import { isAsset as isGltf } from '../EntityInspector/GltfInspector/utils'
import { toWearableWithBlobs } from './utils'
import { Props } from './types'

import './AssetPreview.css'
import { useRef } from 'react'

const WIDTH = 300
const HEIGHT = 300

export function AssetPreview({ value, resources, onScreenshot, onLoad }: Props) {
  const name = value.name
  const isImage = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')

  return (
    <div className="AssetPreview">
      {isGltf(name) ? (
        <GltfPreview value={value} resources={resources} onScreenshot={onScreenshot} onLoad={onLoad} />
      ) : isImage ? (
        <PngPreview value={value} onScreenshot={onScreenshot} onLoad={onLoad} />
      ) : (
        <IoIosImage />
      )}
    </div>
  )
}

function GltfPreview({ value, resources, onScreenshot, onLoad }: Props) {
  const handleLoad = React.useCallback(() => {
    onLoad?.()
    const wp = WearablePreview.createController(value.name)
    void wp.scene.getScreenshot(WIDTH, HEIGHT).then(($) => onScreenshot($))
  }, [onLoad])

  return (
    <WearablePreview
      id={value.name}
      blob={toWearableWithBlobs(value, resources)}
      disableAutoRotate
      disableBackground
      projection={PreviewProjection.ORTHOGRAPHIC}
      camera={PreviewCamera.STATIC}
      onLoad={handleLoad}
    />
  )
}

function PngPreview({ value, onScreenshot, onLoad }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const url = URL.createObjectURL(value)
  const img = new Image(WIDTH, HEIGHT)
  img.src = url

  img.onload = () => {
    onLoad?.()
    const canvas = canvasRef.current
    const ctx = canvasRef.current?.getContext('2d')
    const canvas2 = document.createElement('canvas')
    const ctx2 = canvas2.getContext('2d')

    if (canvas && ctx && ctx2) {
      canvas.height = canvas.width * (img.height / img.width)

      canvas2.width = img.width * 0.5
      canvas2.height = img.height * 0.5
      ctx2.drawImage(img, 0, 0, canvas2.width, canvas2.height)
      ctx2.drawImage(canvas2, 0, 0, canvas2.width * 0.5, canvas2.height * 0.5)
      ctx.drawImage(canvas2, 0, 0, canvas2.width * 0.5, canvas2.height * 0.5, 0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, WIDTH, HEIGHT)

      onScreenshot(canvas.toDataURL('image/png'))

      canvas2.remove()
    }
  }

  return <canvas ref={canvasRef} id="asset-png-preview" touch-action="none"></canvas>
}
