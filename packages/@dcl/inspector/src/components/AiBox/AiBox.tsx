/* eslint-disable no-console */
import React, { useCallback, useMemo, useState } from 'react'
import { RxCross2 } from 'react-icons/rx'
import { IoIosImage } from 'react-icons/io'

import { Player } from '@lottiefiles/react-lottie-player'
import { Dimmer } from 'decentraland-ui/dist/components/Dimmer/Dimmer'

import { withSdk } from '../../hoc/withSdk'
import { Container } from '../Container'
import { TextField } from '../EntityInspector/TextField'
import Button from '../Button'

import loadingJson from './loading.json'

import './AiBox.css'

interface PropTypes {
  onSave(): void
}

type PlayerFix = React.Component

const PlayerFixed = Player as any as {
  new (): PlayerFix
}

const AiBox = withSdk<PropTypes>(({ sdk, onSave }) => {
  const [file, setFile] = useState<File>()
  const [assetPackageName, setAssetPackageName] = useState<string>('')
  const [value, setValue] = useState<string>('')
  const [error, setError] = useState<boolean>(false)
  const [isLoading, setLoading] = useState(false)

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

  const submitAiRequest = useCallback(async (value: string) => {
    if (value && value !== '') {
      // TODO: change the url to the real one
      /* const response = await fetch(`https://2218-181-13-71-243.sa.ngrok.io/prompt?text=${value}`, {
        method: 'GET'
      }) */
      try {
        const filename = value.replace(/\s+/gi, '-')
        setLoading(true)
        setError(false)
        const response = await fetch(`http://localhost:3000/render?prompt=${encodeURI(value)}&sampler=shap_e`)
        const blob = (await response.blob()) as File
        const file = new File([blob], `${filename}.glb`)
        setLoading(false)
        setFile(file)
        setAssetPackageName(`ai`)
      } catch (error) {
        console.log(error)
        setLoading(false)
        setError(true)
      }
    }
  }, [])

  const playerProps = useMemo(() => {
    return {
      autoplay: true,
      loop: true,
      Controls: false,
      src: loadingJson,
      style: { height: '300px', width: '300px' }
    }
  }, [loadingJson])

  return (
    <div className="AiBox">
      {!file && (
        <div className="ai-box__container">
          <div className="row">
            {!isLoading && (
              <>
                <TextField
                  label="Prompt"
                  type="text"
                  value={value}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setValue(event.currentTarget.value)}
                />
                <Button onClick={() => submitAiRequest(value)}>Submit</Button>
              </>
            )}
            {isLoading && (
              <>
                <Dimmer active>
                  <PlayerFixed {...playerProps} />
                </Dimmer>
              </>
            )}
          </div>
          {error && (
            <div className="row">
              <label className="ai-box__error">There is an issue, try later...</label>
            </div>
          )}
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
          <div>
            <Button onClick={handleSave}>Save asset</Button>
          </div>
        </div>
      )}
    </div>
  )
})

export default AiBox
