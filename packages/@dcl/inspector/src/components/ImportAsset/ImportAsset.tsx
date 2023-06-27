import React, { useCallback, useState } from 'react'
import { HiOutlineUpload } from 'react-icons/hi'
import { RxCross2 } from 'react-icons/rx'
import { IoIosImage } from 'react-icons/io'

import FileInput from '../FileInput'
import { Container } from '../Container'
import { TextField } from '../EntityInspector/TextField'
import { Block } from '../Block'
import Button from '../Button'
import { removeBasePath } from '../../lib/logic/remove-base-path'

import { GLTFValidation } from '@babylonjs/loaders'

import './ImportAsset.css'
import classNames from 'classnames'
import { DIRECTORY, withAssetDir } from '../../lib/data-layer/host/fs-utils'
import { importAsset } from '../../redux/data-layer'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { selectAssetCatalog } from '../../redux/app'

const ONE_MB_IN_BYTES = 1_048_576
const ONE_GB_IN_BYTES = ONE_MB_IN_BYTES * 1024

interface PropTypes {
  onSave(): void
}

type ValidationError = string | null

async function validateGltf(data: ArrayBuffer): Promise<ValidationError> {
  let result
  try {
    result = await GLTFValidation.ValidateAsync(data, '', '', (_uri) => {
      throw new Error('external references are not supported yet')
    })
  } catch (error) {
    return `Invalid GLTF: ${error}`
  }

  if (result.issues.numErrors > 0) {
    for (const issue of result.issues.messages) {
      /*
        Babylon's type declarations incorrectly state that result.issues.messages
        is an Array<string>. In fact, it's an array of objects with useful properties.
      */
      type BabylonValidationIssue = { severity: number; code: string }
      const severity = (issue as unknown as BabylonValidationIssue).severity
      /*
        Severity codes are Error (0), Warning (1), Information (2), Hint (3).
        https://github.com/KhronosGroup/glTF-Validator/blob/main/lib/src/errors.dart
      */
      if (severity === 0) {
        const message = (issue as unknown as BabylonValidationIssue).code
        return `Invalid GLTF: ${message}`
      }
    }
    return 'Invalid GLTF: unknown reason'
  } else {
    return null
  }
}

const ImportAsset: React.FC<PropTypes> = ({ onSave }) => {
  // TODO: multiple files
  const dispatch = useAppDispatch()
  const files = useAppSelector(selectAssetCatalog)

  const [file, setFile] = useState<File>()
  const [validationError, setValidationError] = useState<ValidationError>(null)
  const [assetName, setAssetName] = useState<string>('')
  const [assetExtension, setAssetExtension] = useState<string>('')
  const { basePath, assets } = files ?? { basePath: '', assets: [] }

  const handleDrop = async (acceptedFiles: File[]) => {
    // TODO: handle zip file. GLB with multiple external image references
    const file = acceptedFiles[0]
    if (!file) return
    setFile(file)
    setValidationError(null)
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

      const gltfValidationError = await validateGltf(binary)
      if (gltfValidationError !== null) {
        setValidationError(gltfValidationError)
        return
      }

      const content: Map<string, Uint8Array> = new Map()
      content.set(assetName + '.' + assetExtension, new Uint8Array(binary))

      dispatch(
        importAsset({
          content,
          basePath: withAssetDir(DIRECTORY.SCENE),
          assetPackageName: ''
        })
      )
      onSave()
    }
    reader.readAsArrayBuffer(file)
  }

  function removeFile(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    setFile(undefined)
    setValidationError(null)
  }

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAssetName(event.target.value)
  }, [])

  const invalidName = !!assets.find((asset) => {
    const [packageName, otherAssetName] = removeBasePath(basePath, asset.path).split('/')
    if (packageName === 'builder') return false
    else return otherAssetName?.toLocaleLowerCase() === assetName?.toLocaleLowerCase() + '.' + assetExtension
  })

  return (
    <div className="ImportAsset">
      <FileInput disabled={!!file} onDrop={handleDrop} accept={{ 'model/gltf-binary': ['.gltf', '.glb'] }}>
        {!file && (
          <>
            <div className="upload-icon">
              <HiOutlineUpload />
            </div>
            <span>
              To import an asset drag and drop a single GLB or GLTF file
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
              <IoIosImage />
              <div className="file-title">{file.name}</div>
            </Container>
            <div className={classNames({ error: !!invalidName })}>
              <Block label="Asset name">
                <TextField label="" value={assetName} onChange={handleNameChange} />
              </Block>
              <Button disabled={invalidName || !!validationError} onClick={handleSave}>
                Import
              </Button>
              <span className="error">{validationError}</span>
            </div>
          </div>
        )}
      </FileInput>
    </div>
  )
}

export default ImportAsset
