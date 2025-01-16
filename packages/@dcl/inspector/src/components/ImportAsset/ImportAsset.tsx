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
import { Modal } from '../Modal'
import { Input } from '../Input'
import { InputRef } from '../FileInput/FileInput'

import { formatFileName, processAssets, getAssetSize, getAssetResources } from './utils'
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
  const [screenshots, setScreenshots] = useState<Map<string, string>>(new Map())
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

  const removeAsset = useCallback((asset: Asset) => {
    // e.stopPropagation()
    setFiles(files.filter((file) => file.name !== asset.name))
  }, [])

  const handleCloseModal = useCallback(() => {
    setFiles([])
    setScreenshots(new Map())
  }, [])

  const handleScreenshot = useCallback((file: Asset) => (thumbnail: string) => {
    const map = screenshots.set(formatFileName(file), thumbnail)
    setScreenshots(new Map(map))
  }, [])

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
        ) : (
          <>
            {files.map(($, i) => {
              const resources = getAssetResources($)
              return (
                <div key={i} style={{ display: 'none' }}>
                  <AssetPreview value={$.blob} resources={resources} onScreenshot={handleScreenshot($)} />
                </div>
              )
            })}
            {children}
          </>
        )}
        <Modal
          isOpen={!!files.length}
          onRequestClose={handleCloseModal}
          className="ImportAssetModal"
          overlayClassName="ImportAssetModalOverlay"
        >
          <h2>Import Assets</h2>
          <div className="slider">
            {files.length > 1 && <span className="counter">{files.length}</span>}
            <div className="content">
              {files.length > 1 && <span className="left"></span>}
              <div className="slides">
                {files.map(($, i) => {
                  const name = formatFileName($)
                  return (
                    <div className="asset" key={i}>
                      <img className="thumbnail" src={screenshots.get(name)} />
                      <Input value={name} />
                      <span className="size">{getAssetSize($)}</span>
                    </div>
                  )
                })}
              </div>
              {files.length > 1 && <span className="right"></span>}
            </div>
          </div>
          <Button type="danger" size="big">IMPORT ALL</Button>
        </Modal>
      </FileInput>
    </div>
  )
})

export default ImportAsset
