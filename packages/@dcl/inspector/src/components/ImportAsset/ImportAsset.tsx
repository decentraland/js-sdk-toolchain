import React, { useState } from 'react'
import { HiOutlineUpload } from 'react-icons/hi'
import { RxCross2 } from 'react-icons/rx'
import { IoIosImage } from 'react-icons/io'

import FileInput from '../FileInput'
import { withSdk } from '../../hoc/withSdk'
import { Container } from '../Container'
import { TextField } from '../EntityInspector/TextField'
import { Block } from '../Block'
import Button from '../Button'
import { useFileSystem } from '../../hooks/catalog/useFileSystem'

import './ImportAsset.css'
import classNames from 'classnames'

const ONE_MB_IN_BYTES = 1_048_576
const ONE_GB_IN_BYTES = ONE_MB_IN_BYTES * 1024

interface PropTypes {
  onSave(): void
}

const ImportAsset = withSdk<PropTypes>(({ sdk, onSave }) => {
  // TODO: multiple files
  const [file, setFile] = useState<File>()
  const [assetPackageName, setAssetPackageName] = useState<string>('')
  const [systemFiles] = useFileSystem()

  const handleDrop = async (acceptedFiles: File[]) => {
    // TODO: handle zip file. GLB with multiple external image references
    const file = acceptedFiles[0]
    if (!file) return
    setFile(file)
    setAssetPackageName(file.name.trim().replaceAll(' ', '_').toLowerCase().split('.')[0])
  }

  const destFolder = 'assets/'
  const handleSave = () => {
    const reader = new FileReader()
    if (!file) return
    reader.onload = async () => {
      const binary: ArrayBuffer = reader.result as ArrayBuffer
      const content: Map<string, Uint8Array> = new Map()
      content.set(file.name, new Uint8Array(binary))

      await sdk!.dataLayer.importAsset({
        content,
        basePath: destFolder,
        assetPackageName
      })
      onSave()
    }
    reader.readAsArrayBuffer(file)
  }

  function removeFile(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    setFile(undefined)
  }

  const invalidName = !!systemFiles.assets.find((asset) => {
    const [_, packageName] = asset.path.split('/')
    return packageName?.toLocaleLowerCase() === assetPackageName?.toLocaleLowerCase()
  })

  const validSize = (file?.size || 0) <= ONE_GB_IN_BYTES

  return (
    <div className="ImportAsset">
      <FileInput disabled={!!file} onDrop={handleDrop} accept={{ 'model/gltf-binary': ['.gltf', '.glb'] }}>
        <span>Import Asset Pack</span>
        {!file && (
          <>
            <div className="upload-icon">
              <HiOutlineUpload />
            </div>
            <span>
              Drag and drop a single GLB, GLTF file here,
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
            <div className={classNames({ error: !!invalidName || !validSize })}>
              <Block label="Asset Pack Name">
                <TextField
                  label=""
                  value={assetPackageName}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setAssetPackageName(event.target.value)}
                />
              </Block>
              <Button disabled={invalidName || !validSize} onClick={handleSave}>
                Save asset
              </Button>
              <span>{!validSize && 'Asset size must be under 1GB'}</span>
            </div>
          </div>
        )}
      </FileInput>
    </div>
  )
})

export default ImportAsset
