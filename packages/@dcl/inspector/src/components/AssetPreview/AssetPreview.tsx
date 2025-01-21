import { useCallback, useMemo } from 'react'
import { PreviewCamera, PreviewProjection } from '@dcl/schemas'
import { WearablePreview } from 'decentraland-ui'
import { AiFillSound } from 'react-icons/ai'
import { IoVideocamOutline } from 'react-icons/io5'
import { FaFile } from 'react-icons/fa'

import { toWearableWithBlobs } from './utils'
import { Props } from './types'

import './AssetPreview.css'
import { useRef } from 'react'

const WIDTH = 300
const HEIGHT = 300

export function AssetPreview({ value, resources, onScreenshot, onLoad }: Props) {
  const preview = useMemo(() => {
    const ext = value.name.split('.').pop()
    switch (ext) {
      case 'gltf':
      case 'glb':
        return <GltfPreview value={value} resources={resources} onScreenshot={onScreenshot} onLoad={onLoad} />
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <PngPreview value={value} onScreenshot={onScreenshot} onLoad={onLoad} />
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <AiFillSound />
      case 'mp4':
        return <IoVideocamOutline />
      default:
        return <FaFile />
    }
  }, [])

  return <div className="AssetPreview">{preview}</div>
}

function GltfPreview({ value, resources, onScreenshot, onLoad }: Props) {
  const handleLoad = useCallback(() => {
    onLoad?.()
    const wp = WearablePreview.createController(value.name)
    void wp.scene.getScreenshot(WIDTH, HEIGHT).then(($) => onScreenshot($))
  }, [onLoad])

  return (
    <WearablePreview
      id={value.name}
      blob={toWearableWithBlobs(value, resources)}
      disableAutoRotate
      background="#3c3c3c"
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
