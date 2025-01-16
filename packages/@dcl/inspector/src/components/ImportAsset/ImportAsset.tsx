import React, { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import cx from 'classnames'
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
import { InputRef } from '../FileInput/FileInput'

const ACCEPTED_FILE_TYPES = {
  'model/gltf-binary': ['.gltf', '.glb', '.bin'],
  'image/png': ['.png'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'video/mp4': ['.mp4']
}

const ACCEPTED_FILE_TYPES_STR = Object
  .values(ACCEPTED_FILE_TYPES)
  .flat().join('/')
  .replaceAll('.', '')
  .toUpperCase()

interface PropTypes {
  onSave(): void
}

const ImportAsset = React.forwardRef<InputRef, React.PropsWithChildren<PropTypes>>(({ onSave, children }, inputRef) => {
  const dispatch = useAppDispatch()
  const catalog = useAppSelector(selectAssetCatalog)
  const uploadFile = useAppSelector(selectUploadFile)

  const [files, setFiles] = useState<Asset[]>([])
  const [isHover, setIsHover] = useState(false)
  const { basePath, assets } = catalog ?? { basePath: '', assets: [] }

  useEffect(() => {
      const isValidFile = uploadFile && 'name' in uploadFile
      if (isValidFile && !files.find(($) => $.name === uploadFile.name)) {
        handleDrop([Object.values(uploadFile!)[0] as File])
      }
    }, [uploadFile])

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    const assets = await processAssets(acceptedFiles)
    console.log('assets: ', assets)
    setFiles(assets)
  }, [])

  const handleHover = useCallback((isHover: boolean) => {
    setIsHover(isHover)
  }, [])

  function removeAsset(asset: Asset) {
    // e.stopPropagation()
    setFiles(files.filter((file) => file.name !== asset.name))
  }

  return (
    <div className={cx("ImportAsset", { ImportAssetHover: isHover })}>
      <FileInput disabled={!!files.length} onDrop={handleDrop} onHover={handleHover} ref={inputRef} accept={ACCEPTED_FILE_TYPES}>
        {!files.length && isHover ? (
          <>
            <div className="upload-icon">
              <HiOutlineUpload />
            </div>
            <span className="text">Drop {ACCEPTED_FILE_TYPES_STR} files</span>
          </>
        ) : children}
      </FileInput>
    </div>
  )
})

export default ImportAsset
