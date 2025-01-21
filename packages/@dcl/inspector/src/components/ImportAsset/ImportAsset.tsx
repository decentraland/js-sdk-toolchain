import React, { PropsWithChildren, useCallback, useEffect, useState } from 'react'
import cx from 'classnames'
import { HiOutlineUpload } from 'react-icons/hi'

import { removeBasePath } from '../../lib/logic/remove-base-path'
import { DIRECTORY, transformBase64ResourceToBinary, withAssetDir } from '../../lib/data-layer/host/fs-utils'
import { importAsset, saveThumbnail } from '../../redux/data-layer'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { selectAssetCatalog, selectUploadFile, updateUploadFile } from '../../redux/app'

import FileInput from '../FileInput'
import { Modal } from '../Modal'
import { InputRef } from '../FileInput/FileInput'
import { Slider } from './Slider'

import { processAssets, assetsAreValid, ACCEPTED_FILE_TYPES, formatFileName, transformAssetToImport } from './utils'
import { Asset, isGltfAsset } from './types'

import './ImportAsset.css'

const ACCEPTED_FILE_TYPES_STR = Object
  .values(ACCEPTED_FILE_TYPES)
  .flat().join('/')
  .replaceAll('.', '')
  .toUpperCase()

interface PropTypes {
  onSave(): void
}

const ImportAsset = React.forwardRef<InputRef, PropsWithChildren<PropTypes>>(({ onSave, children }, inputRef) => {
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
    setFiles(assets)
  }, [])

  const handleHover = useCallback((isHover: boolean) => {
    setIsHover(isHover)
  }, [])

  const handleCloseModal = useCallback(() => {
    setFiles([])
  }, [])

  const handleImport = useCallback(async (assets: Asset[]) => {
    if (!assetsAreValid(assets)) return

    const basePath = withAssetDir(DIRECTORY.SCENE)
    // TODO: we are dispatching importAsset + saveThumbnail for every asset, refreshing the app state and UI multiple
    // times. This can be improved by doing all the process once...
    for (const asset of assets) {
      const content = await transformAssetToImport(asset)

      dispatch(
        importAsset({
          content,
          basePath,
          assetPackageName: isGltfAsset(asset) ? asset.name : '',
          reload: true
        })
      )

      if (asset.thumbnail) {
        dispatch(
          saveThumbnail({
            content: transformBase64ResourceToBinary(asset.thumbnail),
            path: `${DIRECTORY.THUMBNAILS}/${asset.name}.png`
          })
        )
      }

      // Clear uploaded file from the FileUploadField
      const newUploadFile = { ...uploadFile }
      for (const key in newUploadFile) {
        newUploadFile[key] = `${basePath}/${formatFileName(asset)}`
      }
      dispatch(updateUploadFile(newUploadFile))
    }

    setFiles([])
    onSave()
  }, [uploadFile])

  // const isNameUnique = useCallback((name: string, ext: string) => {
  //   return !assets.find((asset) => {
  //     const [packageName, otherAssetName] = removeBasePath(basePath, asset.path).split('/')
  //     if (packageName === 'builder') return false
  //     return otherAssetName?.toLocaleLowerCase() === name?.toLocaleLowerCase() + '.' + ext
  //   })
  // }, [])

  // const isNameRepeated = !isNameUnique(assetName, assetExtension)

  return (
    <div className={cx("ImportAsset", { ImportAssetHover: isHover })}>
      <FileInput disabled={!!files.length} onDrop={handleDrop} onHover={handleHover} ref={inputRef} accept={ACCEPTED_FILE_TYPES} multiple>
        {!files.length && isHover ? (
          <>
            <div className="upload-icon">
              <HiOutlineUpload />
            </div>
            <span className="text">Drop {ACCEPTED_FILE_TYPES_STR} files</span>
          </>
        ) : children}
        <Modal
          isOpen={!!files.length}
          onRequestClose={handleCloseModal}
          className="ImportAssetModal"
          overlayClassName="ImportAssetModalOverlay"
        >
          <h2>Import Assets</h2>
          <Slider assets={files} onSubmit={handleImport} />
        </Modal>
      </FileInput>
    </div>
  )
})

export default ImportAsset
