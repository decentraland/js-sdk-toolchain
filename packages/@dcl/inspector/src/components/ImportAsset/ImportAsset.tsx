import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { HiOutlineUpload } from 'react-icons/hi'
import { RxCross2 } from 'react-icons/rx'
import classNames from 'classnames'

import { removeBasePath } from '../../lib/logic/remove-base-path'
import { DIRECTORY, transformBase64ResourceToBinary, withAssetDir } from '../../lib/data-layer/host/fs-utils'
import { importAsset, saveThumbnail } from '../../redux/data-layer'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { selectAssetCatalog, selectUploadFile, updateUploadFile } from '../../redux/app'

import FileInput from '../FileInput'
import { Container } from '../Container'
import { TextField } from '../ui/TextField'
import { Block } from '../Block'
import { Button } from '../Button'
import { AssetPreview } from '../AssetPreview'

import { processAssets } from './utils'
import { Asset } from './types'

import './ImportAsset.css'

const ACCEPTED_FILE_TYPES = {
  'model/gltf-binary': ['.gltf', '.glb', '.bin'],
  'image/png': ['.png'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'video/mp4': ['.mp4']
}

interface PropTypes {
  onSave(): void
}

const ImportAsset: React.FC<PropTypes> = ({ onSave }) => {
  const dispatch = useAppDispatch()
  const catalog = useAppSelector(selectAssetCatalog)
  const uploadFile = useAppSelector(selectUploadFile)

  const [files, setFiles] = useState<Asset[]>([])
  const { basePath, assets } = catalog ?? { basePath: '', assets: [] }

  useEffect(() => {
      const isValidFile = uploadFile && 'name' in uploadFile
      if (isValidFile && !files.find(($) => $.name === uploadFile.name)) {
        handleDrop([Object.values(uploadFile!)[0] as File])
      }
    }, [uploadFile])

  const handleDrop = async (acceptedFiles: File[]) => {
    const assets = await processAssets(acceptedFiles)
    console.log('assets: ', assets)
    setFiles(assets)
  }

  const handleSave = () => {
    //   const basePath = withAssetDir(DIRECTORY.SCENE)
    //   const content: Map<string, Uint8Array> = new Map()
    //   const fullName = assetName + '.' + assetExtension
    //   content.set(fullName, new Uint8Array(binary))

    //   dispatch(
    //     importAsset({
    //       content,
    //       basePath,
    //       assetPackageName: '',
    //       reload: true
    //     })
    //   )

    //   if (thumbnail) {
    //     dispatch(
    //       saveThumbnail({
    //         content: transformBase64ResourceToBinary(thumbnail),
    //         path: `${DIRECTORY.THUMBNAILS}/${assetName}.png`
    //       })
    //     )
    //   }

    //   // Clear uploaded file from the FileUploadField
    //   const newUploadFile = { ...uploadFile }
    //   for (const key in newUploadFile) {
    //     newUploadFile[key] = `${basePath}/${fullName}`
    //   }
    //   dispatch(updateUploadFile(newUploadFile))
    //   setFile(undefined)

    //   onSave()
    // }
  }

  function removeAsset(asset: Asset) {
    // e.stopPropagation()
    setFiles(files.filter((file) => file.name !== asset.name))
  }

  // const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
  //   setAssetName(event.target.value)
  // }, [])

  // const isNameUnique = useCallback((name: string, ext: string) => {
  //   return !assets.find((asset) => {
  //     const [packageName, otherAssetName] = removeBasePath(basePath, asset.path).split('/')
  //     if (packageName === 'builder') return false
  //     return otherAssetName?.toLocaleLowerCase() === name?.toLocaleLowerCase() + '.' + ext
  //   })
  // }, [])

  // const isNameRepeated = !isNameUnique(assetName, assetExtension)

  // const handleScreenshot = useCallback(
  //   (value: string) => {
  //     setThumbnail(value)
  //   },
  //   [files]
  // )

  const types = useMemo(() => Object.values(ACCEPTED_FILE_TYPES).flat().join('/').replaceAll('.', '').toUpperCase(), [])

  return (
    <div className="ImportAsset">
      <FileInput disabled={!!files.length} onDrop={handleDrop} accept={ACCEPTED_FILE_TYPES}>
        {!files.length && (
          <>
            <div className="upload-icon">
              <HiOutlineUpload />
            </div>
            <span className="text">Drop {types} files</span>
          </>
        )}
        {/* {file && (
          <div className="file-container">
            <Container>
              <div className="remove-icon" onClick={removeAsset}>
                <RxCross2 />
              </div>
              <AssetPreview value={file} onScreenshot={handleScreenshot} />
              <div className="file-title">{file.name}</div>
            </Container>
            <div className={classNames({ error: isNameRepeated })}>
              <Block label="Asset name">
                <TextField autoSelect value={assetName} onChange={handleNameChange} />
              </Block>
              <Button disabled={!!validationError} onClick={handleSave}>
                Import
              </Button>
            </div>
          </div>
        )}
        <span className="error">{validationError}</span>
        {isNameRepeated && (
          <span className="warning">There's a file with this name already, you will overwrite it if you continue</span>
        )} */}
      </FileInput>
    </div>
  )
}

export default ImportAsset
