import * as React from 'react'
import { PreviewCamera, PreviewProjection } from '@dcl/schemas'
import { WearablePreview } from 'decentraland-ui'
import { IoIosImage } from 'react-icons/io'

import { isAsset as isGltf } from '../EntityInspector/GltfInspector/utils'
import { toWearableWithBlobs } from './utils'
import { Props } from './types'

import './AssetPreview.css'

export function AssetPreview({ value, onScreenshot }: Props) {
  const onLoad = React.useCallback(() => {
    const wp = WearablePreview.createController(value.name)
    void wp.scene.getScreenshot(1024, 1024).then(($) => onScreenshot($))
  }, [])

  return (
    <div className="AssetPreview">
      {isGltf(value.name) ? (
        <WearablePreview
          id={value.name}
          blob={toWearableWithBlobs(value)}
          disableAutoRotate
          disableBackground
          projection={PreviewProjection.ORTHOGRAPHIC}
          camera={PreviewCamera.STATIC}
          onLoad={onLoad}
        />
      ) : (
        <IoIosImage />
      )}
    </div>
  )
}
