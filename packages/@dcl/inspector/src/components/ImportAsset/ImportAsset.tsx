import React, { PropsWithChildren, useCallback, useEffect, useState, useMemo } from 'react'
import cx from 'classnames'
import { HiOutlineUpload } from 'react-icons/hi'

import { removeBasePath } from '../../lib/logic/remove-base-path'
import { DIRECTORY, transformBase64ResourceToBinary, withAssetDir } from '../../lib/data-layer/host/fs-utils'
import { importAsset, saveThumbnail } from '../../redux/data-layer'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { selectAssetCatalog, selectUploadFile, updateAssetCatalog, updateUploadFile } from '../../redux/app'

import FileInput from '../FileInput'
import { Modal } from '../Modal'
import { InputRef } from '../FileInput/FileInput'
import { Slider } from './Slider'

import {
  processAssets,
  assetsAreValid,
  ACCEPTED_FILE_TYPES,
  formatFileName,
  convertAssetToBinary,
  buildAssetPath
} from './utils'
import { Asset } from './types'

import './ImportAsset.css'
import { Error } from './Error'

const ACCEPTED_FILE_TYPES_STR = Object.values(ACCEPTED_FILE_TYPES).flat().join('/').replaceAll('.', '').toUpperCase()

interface PropTypes {
  onSave(): void
}

const ImportAsset = React.forwardRef<InputRef, PropsWithChildren<PropTypes>>(({ onSave, children }, inputRef) => {
  const dispatch = useAppDispatch()
  const uploadFile = useAppSelector(selectUploadFile)
  const catalog = useAppSelector(selectAssetCatalog) ?? { basePath: '', assets: [] }
  const [files, setFiles] = useState<Asset[]>([])
  const [isHover, setIsHover] = useState(false)
  const { basePath, assets } = catalog ?? { basePath: '', assets: [] }

  useEffect(() => {
    const isValidFile = uploadFile && 'name' in uploadFile
    if (isValidFile && !files.find(($) => $.name === uploadFile.name)) {
      void handleDrop([Object.values(uploadFile!)[0] as File])
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

  const handleImport = useCallback(
    async (assets: Asset[]) => {
      if (!assetsAreValid(assets)) return
      const basePath = withAssetDir(DIRECTORY.SCENE)

      for (const asset of assets) {
        const content = await convertAssetToBinary(asset)
        const assetPackageName = buildAssetPath(asset)

        dispatch(
          importAsset({
            content,
            basePath,
            assetPackageName,
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

        const newUploadFile = { ...uploadFile }
        for (const key in newUploadFile) {
          newUploadFile[key] = `${basePath}/${formatFileName(asset)}`
        }
        dispatch(updateUploadFile(newUploadFile))
      }
      dispatch(updateAssetCatalog({ assets: catalog, customAssets: [] }))

      setFiles([])
      onSave()
    },
    [uploadFile]
  )

  const validateName = useCallback(
    (asset: Asset, fileName: string) => {
      return !assets.find(($) => {
        const [packageName, ...otherAssetName] = removeBasePath(basePath, $.path).split('/')
        if (packageName === 'builder') return false
        const assetPath = buildAssetPath(asset)
        return otherAssetName.join('/') === `${assetPath}/${fileName}`
      })
    },
    [assets]
  )

  const isImportActive = useMemo(() => !files.length && isHover, [files, isHover])

  return (
    <div className={cx('ImportAsset', { ImportAssetHover: isHover })}>
      <FileInput disabled={!!files.length} onDrop={handleDrop} onHover={handleHover} ref={inputRef} multiple>
        {isImportActive && (
          <>
            <div className="upload-icon">
              <HiOutlineUpload />
            </div>
            <span className="text">Drop {ACCEPTED_FILE_TYPES_STR} files</span>
          </>
        )}
        <div className={cx('children', { hidden: isImportActive })}>{children}</div>
        <Modal
          isOpen={!!files.length}
          onRequestClose={handleCloseModal}
          className="ImportAssetModal"
          overlayClassName="ImportAssetModalOverlay"
        >
          {assetsAreValid(files) ? (
            <Slider assets={files} onSubmit={handleImport} isNameValid={validateName} />
          ) : (
            <Error
              assets={files}
              errorMessage="Asset failed to import"
              primaryAction={{ name: 'OK', onClick: handleCloseModal }}
            />
          )}
        </Modal>
      </FileInput>
    </div>
  )
})

export default ImportAsset
