import React, { useCallback, useState, useEffect } from 'react'
import { Loader } from 'decentraland-ui/dist/components/Loader/Loader'
import { Container } from '../Container'
import { Block } from '../Block'
import { TextField } from '../ui/TextField'
import { Button } from '../Button'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { selectAssetsTab } from '../../redux/ui'
import { AssetsTab } from '../../redux/ui/types'
import {
  clearStagedCustomAsset,
  createCustomAsset,
  getDataLayerInterface,
  selectStagedCustomAsset
} from '../../redux/data-layer'
import { useSdk } from '../../hooks/sdk/useSdk'
import { AssetPreview } from '../AssetPreview'

import './CreateCustomAsset.css'
import CustomAssetIcon from '../Icons/CustomAsset'

const CreateCustomAsset: React.FC = () => {
  const dispatch = useAppDispatch()
  const sdk = useSdk()
  const stagedCustomAsset = useAppSelector(selectStagedCustomAsset)
  const [name, setName] = useState(() => {
    if (!stagedCustomAsset) return ''
    return stagedCustomAsset.initialName
  })
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(true)

  useEffect(() => {
    const loadPreviewFile = async () => {
      if (!sdk || !stagedCustomAsset) return
      const asset = sdk.operations.createCustomAsset(stagedCustomAsset.entities)
      if (!asset) return

      // Find the first GLB/GLTF file in resources
      const modelFile = asset.resources.find(
        (path) => path.toLowerCase().endsWith('.glb') || path.toLowerCase().endsWith('.gltf')
      )
      if (!modelFile) return

      try {
        const dataLayer = getDataLayerInterface()
        if (!dataLayer) return
        const { content } = await dataLayer.getFile({ path: modelFile })
        setPreviewFile(new File([content], modelFile.split('/').pop() || 'model', { type: 'model/gltf-binary' }))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load preview file:', error)
      }
    }
    void loadPreviewFile()
  }, [sdk, stagedCustomAsset])

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value)
  }, [])

  const handleCreate = useCallback(() => {
    if (!sdk || !stagedCustomAsset) return
    const asset = sdk.operations.createCustomAsset(stagedCustomAsset.entities)
    if (asset) {
      dispatch(createCustomAsset({ ...asset, name, thumbnail: thumbnail || undefined }))
      dispatch(selectAssetsTab({ tab: AssetsTab.CustomAssets }))
    }
  }, [dispatch, sdk, stagedCustomAsset, name, thumbnail])

  const handleCancel = useCallback(() => {
    dispatch(clearStagedCustomAsset())
    if (stagedCustomAsset) {
      dispatch(selectAssetsTab({ tab: stagedCustomAsset.previousTab }))
    }
  }, [dispatch, stagedCustomAsset])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleCreate()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        handleCancel()
      }
    },
    [handleCreate, handleCancel]
  )

  const handleScreenshot = useCallback((value: string) => {
    setIsGeneratingThumbnail(false)
    setThumbnail(value)
  }, [])

  if (!stagedCustomAsset) return null

  return (
    <div className="CreateCustomAsset">
      <Container>
        <div className="file-container">
          {previewFile ? (
            <div className="preview-container">
              {isGeneratingThumbnail && (
                <div className="loader-container">
                  <Loader active size="small" />
                </div>
              )}
              <AssetPreview value={previewFile} onScreenshot={handleScreenshot} />
            </div>
          ) : (
            <CustomAssetIcon />
          )}
          <div className="column">
            <Block label="Item name">
              <TextField autoSelect autoFocus value={name} onChange={handleNameChange} onKeyDown={handleKeyDown} />
            </Block>
            <div className="button-container">
              <Button onClick={handleCreate} className="create">
                Create
              </Button>
              <Button onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default CreateCustomAsset
