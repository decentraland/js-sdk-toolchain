/* eslint-disable no-console */
import React, { useCallback, useState } from 'react'
import { RxCross2 } from 'react-icons/rx'
import { IoIosImage } from 'react-icons/io'

import { withSdk } from '../../hoc/withSdk'
import { Container } from '../Container'
import { TextField } from '../EntityInspector/TextField'
import { Block } from '../Block'
import Button from '../Button'
import { useFileSystem } from '../../hooks/catalog/useFileSystem'

import './AiBox.css'
import classNames from 'classnames'

interface PropTypes {
  onSave(): void
}

const AiBox = withSdk<PropTypes>(({ sdk, onSave }) => {
  const [file, setFile] = useState<File>()
  const [assetPackageName, setAssetPackageName] = useState<string>('')
  const [systemFiles] = useFileSystem()
  const [value, setValue] = useState<string>('')

  const destFolder = 'assets/'
  const handleSave = () => {
    const reader = new FileReader()
    if (!file) return
    reader.onload = async () => {
      const binary: ArrayBuffer = reader.result as ArrayBuffer
      const content: Map<string, Uint8Array> = new Map()
      content.set(file.name, new Uint8Array(binary))

      console.log(content)
      console.log(destFolder)

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

  const submitAiRequest = useCallback(async (value: string) => {
    if (value && value !== '') {
      // TODO: change the url to the real one
      /* const response = await fetch(`https://2218-181-13-71-243.sa.ngrok.io/prompt?text=${value}`, {
        method: 'GET'
      }) */
      const response = await fetch(`http://localhost:1000/file`)
      const blob = (await response.blob()) as File
      const file = new File([blob], `prompt_search_${value}_${new Date().toISOString()}.glb`)
      setFile(file)
      setAssetPackageName(`prompt_search_${value}_${new Date().toISOString()}.glb`)
    }
  }, [])

  return (
    <div className="AiBox">
      {!file && (
        <div className="ai-box__container">
          <div>
            <span>Write to see the magic</span>
            <TextField
              label="Texto"
              type="text"
              value={value}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setValue(event.currentTarget.value)}
            />
            <Button onClick={() => submitAiRequest(value)}>Submit</Button>
          </div>
        </div>
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
            <Block label="Asset Pack Name">
              <TextField
                label=""
                value={assetPackageName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setAssetPackageName(event.target.value)}
              />
            </Block>
            <Button disabled={invalidName} onClick={handleSave}>
              Save asset
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})

export default AiBox
