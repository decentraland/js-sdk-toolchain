import React, { useCallback, useState } from 'react'
import { Container } from '../Container'
import { Block } from '../Block'
import { TextField } from '../ui/TextField'
import { Button } from '../Button'
import { useAppDispatch } from '../../redux/hooks'
import { selectAssetsTab } from '../../redux/ui'
import { AssetsTab } from '../../redux/ui/types'
import { clearAssetToRename, renameCustomAsset } from '../../redux/data-layer'

import './RenameAsset.css'
import CustomAssetIcon from '../Icons/CustomAsset'

interface PropTypes {
  assetId: string
  currentName: string
}

const RenameAsset: React.FC<PropTypes> = ({ assetId, currentName }) => {
  const dispatch = useAppDispatch()
  const [name, setName] = useState(currentName)

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value)
  }, [])

  const handleSave = useCallback(() => {
    dispatch(renameCustomAsset({ assetId, newName: name }))
    dispatch(selectAssetsTab({ tab: AssetsTab.CustomAssets }))
  }, [dispatch, assetId, name])

  const handleCancel = useCallback(() => {
    dispatch(clearAssetToRename())
    dispatch(selectAssetsTab({ tab: AssetsTab.CustomAssets }))
  }, [dispatch])

  return (
    <div className="RenameAsset">
      <Container>
        <div className="file-container">
          <CustomAssetIcon />
          <div className="column">
            <Block label="Item name">
              <TextField autoSelect value={name} onChange={handleNameChange} />
            </Block>
            <div className="button-container">
              <Button onClick={handleSave} className="rename">
                Rename
              </Button>
              <Button onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default RenameAsset
