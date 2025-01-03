import React, { useCallback, useState } from 'react'
import { Container } from '../Container'
import { Block } from '../Block'
import { TextField } from '../ui/TextField'
import { Button } from '../Button'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { selectAssetsTab } from '../../redux/ui'
import { AssetsTab } from '../../redux/ui/types'
import { clearStagedCustomAsset, createCustomAsset, selectStagedCustomAsset } from '../../redux/data-layer'
import { useSdk } from '../../hooks/sdk/useSdk'

import './CreateCustomAsset.css'
import CustomAssetIcon from '../Icons/CustomAsset'

const CreateCustomAsset: React.FC = () => {
  const dispatch = useAppDispatch()
  const sdk = useSdk()
  const stagedCustomAsset = useAppSelector(selectStagedCustomAsset)
  const [name, setName] = useState(() => {
    if (!stagedCustomAsset) return ''
    return stagedCustomAsset.initialName
  })

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value)
  }, [])

  const handleCreate = useCallback(() => {
    if (!sdk || !stagedCustomAsset) return
    const asset = sdk.operations.createCustomAsset(stagedCustomAsset.entities)
    if (asset) {
      dispatch(createCustomAsset({ ...asset, name }))
      dispatch(selectAssetsTab({ tab: AssetsTab.CustomAssets }))
    }
  }, [dispatch, sdk, stagedCustomAsset, name])

  const handleCancel = useCallback(() => {
    dispatch(clearStagedCustomAsset())
    if (stagedCustomAsset) {
      dispatch(selectAssetsTab({ tab: stagedCustomAsset.previousTab }))
    }
  }, [dispatch, stagedCustomAsset])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleCreate()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        handleCancel()
      }
    },
    [handleCreate, handleCancel]
  )

  if (!stagedCustomAsset) return null

  return (
    <div className="CreateCustomAsset">
      <Container>
        <div className="file-container">
          <CustomAssetIcon />
          <div className="column">
            <Block label="Asset name">
              <TextField autoSelect autoFocus value={name} onChange={handleNameChange} onKeyDown={handleKeyDown} />
            </Block>
            <div className="button-container">
              <Button onClick={handleCreate} className="create">
                Create
              </Button>
              <Button onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default CreateCustomAsset
