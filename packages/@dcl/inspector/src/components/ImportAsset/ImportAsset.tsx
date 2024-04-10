import { GLTFValidation } from '@babylonjs/loaders'
import React, { useCallback, useEffect, useState } from 'react'
import { HiOutlineUpload } from 'react-icons/hi'
import { RxCross2, RxReload } from 'react-icons/rx'
import classNames from 'classnames'

import FileInput from '../FileInput'
import { Container } from '../Container'
import { TextField } from '../ui/TextField'
import { Block } from '../Block'
import { Button } from '../Button'
import { removeBasePath } from '../../lib/logic/remove-base-path'
import { DIRECTORY, transformBase64ResourceToBinary, withAssetDir } from '../../lib/data-layer/host/fs-utils'
import { importAsset, saveThumbnail } from '../../redux/data-layer'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { selectAssetCatalog, selectUploadFile, updateUploadFile } from '../../redux/app'
import { getRandomMnemonic } from './utils'
import { AssetPreview } from '../AssetPreview'

import './ImportAsset.css'

const ONE_MB_IN_BYTES = 1_048_576
const ONE_GB_IN_BYTES = ONE_MB_IN_BYTES * 1024
const ACCEPTED_FILE_TYPES = {
  'model/gltf-binary': ['.gltf', '.glb'],
  'image/png': ['.png'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'video/mp4': ['.mp4']
}

const IGNORED_ERROR_CODES = ['ACCESSOR_WEIGHTS_NON_NORMALIZED']

interface PropTypes {
  onSave(): void
}

type ValidationError = string | null
/*
  Severity codes are Error (0), Warning (1), Information (2), Hint (3).
  https://github.com/KhronosGroup/glTF-Validator/blob/main/lib/src/errors.dart
*/
type BabylonValidationIssue = {
  severity: number
  code: string
  message: string
  pointer: string
}

async function validateGltf(data: ArrayBuffer): Promise<ValidationError> {
  const pre = 'Invalid GLTF'
  let result
  try {
    result = await GLTFValidation.ValidateAsync(new Uint8Array(data), '', '', (_uri) => {
      throw new Error('external references are not supported yet')
    })
  } catch (error) {
    return `${pre}: ${error}`
  }

  /*
    Babylon's type declarations incorrectly state that result.issues.messages
    is an Array<string>. In fact, it's an array of objects with useful properties.
  */
  const issues = result.issues.messages as unknown as BabylonValidationIssue[]

  const errors = issues.filter((issue) => issue.severity === 0 && !IGNORED_ERROR_CODES.includes(issue.code))

  if (errors.length > 0) {
    const error = errors[0]
    return `${pre}: ${error.message} \n Check ${error.pointer}`
  }

  return null
}

async function validateAsset(extension: string, data: ArrayBuffer): Promise<ValidationError> {
  switch (extension) {
    case 'glb':
    case 'gltf':
      return validateGltf(data)
    // add validators for .png/.ktx2?
    case 'png':
    case 'ktx2':
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'mp4':
      return null
    default:
      return `Invalid asset format ".${extension}"`
  }
}

const ImportAsset: React.FC<PropTypes> = ({ onSave }) => {
  // TODO: multiple files
  const dispatch = useAppDispatch()
  const files = useAppSelector(selectAssetCatalog)
  const uploadFile = useAppSelector(selectUploadFile)

  const [file, setFile] = useState<File>()
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<ValidationError>(null)
  const [assetName, setAssetName] = useState<string>('')
  const [assetExtension, setAssetExtension] = useState<string>('')
  const { basePath, assets } = files ?? { basePath: '', assets: [] }

  useEffect(() => {
    if (uploadFile && typeof uploadFile !== 'string' && (!file || (file && uploadFile.name !== file.name))) {
      handleDrop([Object.values(uploadFile!)[0] as File])
    }
  }, [uploadFile])

  const handleDrop = (acceptedFiles: File[]) => {
    // TODO: handle zip file. GLB with multiple external image references
    const file = acceptedFiles[0]
    if (!file) return
    setFile(file)
    setValidationError(null)
    setThumbnail(null)
    const normalizedName = file.name.trim().replaceAll(' ', '_').toLowerCase()
    const splitName = normalizedName.split('.')
    const extensionName = splitName.pop()
    setAssetName(splitName.join(''))
    setAssetExtension(extensionName ? extensionName : '')
  }

  const handleSave = () => {
    const reader = new FileReader()
    if (!file) return
    reader.onload = async () => {
      const binary: ArrayBuffer = reader.result as ArrayBuffer

      if (binary.byteLength > ONE_GB_IN_BYTES) {
        setValidationError('Files bigger than 1GB are not accepted')
        return
      }

      const validationError = await validateAsset(assetExtension, binary)
      if (validationError !== null) {
        setValidationError(validationError)
        return
      }

      const basePath = withAssetDir(DIRECTORY.SCENE)
      const content: Map<string, Uint8Array> = new Map()
      const fullName = assetName + '.' + assetExtension
      content.set(fullName, new Uint8Array(binary))

      dispatch(
        importAsset({
          content,
          basePath,
          assetPackageName: ''
        })
      )

      if (thumbnail) {
        dispatch(
          saveThumbnail({
            content: transformBase64ResourceToBinary(thumbnail),
            path: `${DIRECTORY.THUMBNAILS}/${assetName}.png`
          })
        )
      }

      // Clear uploaded file from the FileUploadField
      const newUploadFile = { ...uploadFile }
      for (const key in newUploadFile) {
        newUploadFile[key] = `${basePath}/${fullName}`
      }
      dispatch(updateUploadFile(newUploadFile))
      setFile(undefined)

      onSave()
    }
    reader.readAsArrayBuffer(file)
  }

  function removeFile(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    setFile(undefined)
    setValidationError(null)
    setThumbnail(null)
  }

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAssetName(event.target.value)
  }, [])

  const isValidName = useCallback((name: string, ext: string) => {
    return !assets.find((asset) => {
      const [packageName, otherAssetName] = removeBasePath(basePath, asset.path).split('/')
      if (packageName === 'builder') return false
      return otherAssetName?.toLocaleLowerCase() === name?.toLocaleLowerCase() + '.' + ext
    })
  }, [])

  const invalidName = !isValidName(assetName, assetExtension)

  const generateAssetName = useCallback(() => {
    let name: string = assetName
    while (!isValidName(name, assetExtension)) {
      name = getRandomMnemonic()
    }
    setAssetName(name)
  }, [assetName])

  const handleScreenshot = useCallback(
    (value: string) => {
      setThumbnail(value)
    },
    [file]
  )

  return (
    <div className="ImportAsset">
      <FileInput disabled={!!file} onDrop={handleDrop} accept={ACCEPTED_FILE_TYPES}>
        {!file && (
          <>
            <div className="upload-icon">
              <HiOutlineUpload />
            </div>
            <span>
              To import an asset drag and drop a single GLB/GLTF/PNG/MP3/MP4 file
              <br /> or click to select a file.
            </span>
          </>
        )}
        {file && (
          <div className="file-container">
            <Container>
              <div className="remove-icon" onClick={removeFile}>
                <RxCross2 />
              </div>
              <AssetPreview value={file} onScreenshot={handleScreenshot} />
              <div className="file-title">{file.name}</div>
            </Container>
            <div className={classNames({ error: invalidName })}>
              <Block label="Asset name">
                <TextField value={assetName} onChange={handleNameChange} />
                {invalidName && (
                  <div onClick={generateAssetName}>
                    <RxReload />
                  </div>
                )}
              </Block>
              <Button disabled={invalidName || !!validationError} onClick={handleSave}>
                Import
              </Button>
            </div>
          </div>
        )}
        <span className="error">{validationError}</span>
      </FileInput>
    </div>
  )
}

export default ImportAsset
