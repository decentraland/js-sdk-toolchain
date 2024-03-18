import { useCallback, useEffect, useState } from 'react'
import { RxBorderAll } from 'react-icons/rx'
import { IoIosImage } from 'react-icons/io'

import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { withSdk } from '../../../hoc/withSdk'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../../ui/TextField'
import { FileUploadField } from '../../ui/FileUploadField'
import { ACCEPTED_FILE_TYPES } from '../../ui/FileUploadField/types'
import { Props } from './types'
import {
  fromScene,
  toScene,
  toSceneAuto,
  getInputValidation,
  isImage,
  fromSceneSpawnPoint,
  toSceneSpawnPoint
} from './utils'

import './SceneInspector.css'
import { EditorComponentsTypes, SceneAgeRating, SceneCategory, SceneSpawnPoint } from '../../../lib/sdk/components'
import { Dropdown } from '../../ui/Dropdown'
import { TextArea } from '../../ui'
import { Tabs } from '../Tabs'
import { CheckboxField } from '../../ui/CheckboxField'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useArrayState } from '../../../hooks/useArrayState'
import { AddButton } from '../AddButton'
import MoreOptionsMenu from '../MoreOptionsMenu'
import { Button } from '../../Button'
import { useAppDispatch, useAppSelector } from '../../../redux/hooks'
import { getHiddenSceneInspectorTabs, getSelectedSceneInspectorTab, selectSceneInspectorTab } from '../../../redux/ui'
import { SceneInspectorTab } from '../../../redux/ui/types'
import { Tab } from '../Tab'
import { transformBinaryToBase64Resource } from '../../../lib/data-layer/host/fs-utils'
import { selectThumbnails } from '../../../redux/app'

const AGE_RATING_OPTIONS = [
  {
    value: SceneAgeRating.Teen,
    label: 'T (Teens, PG 13+)'
  },
  {
    value: SceneAgeRating.Adult,
    label: 'A (Adults, PG 18+)'
  }
]

const CATEGORIES_OPTIONS = [
  {
    value: SceneCategory.ART,
    label: '🎨 Art'
  },
  {
    value: SceneCategory.GAME,
    label: '🕹️ Game'
  },
  {
    value: SceneCategory.CASINO,
    label: '🃏 Casino'
  },
  {
    value: SceneCategory.SOCIAL,
    label: '👥 Social'
  },
  {
    value: SceneCategory.MUSIC,
    label: '🎶 Music'
  },
  {
    value: SceneCategory.FASHION,
    label: '👠 Fashion'
  },
  {
    value: SceneCategory.CRYPTO,
    label: '🪙 Crypto'
  },
  {
    value: SceneCategory.EDUCATION,
    label: '📚 Education'
  },
  {
    value: SceneCategory.SHOP,
    label: '🛍️ Shop'
  },
  {
    value: SceneCategory.BUSINESS,
    label: '🏢 Business'
  },
  {
    value: SceneCategory.SPORTS,
    label: '🏅 Sports'
  }
]

export default withSdk<Props>(({ sdk, entity }) => {
  const [auto, setAuto] = useState(false)
  const { Scene } = sdk.components

  const hasScene = useHasComponent(entity, Scene)
  const { getInputProps } = useComponentInput(
    entity,
    Scene,
    fromScene,
    auto ? toSceneAuto : toScene,
    getInputValidation(auto)
  )
  const nameProps = getInputProps('name')
  const descriptionProps = getInputProps('description')
  const parcelsProps = getInputProps('layout.parcels')
  const thumbnailProps = getInputProps('thumbnail')
  const ageRatingProps = getInputProps('ageRating')
  const categoriesProps = getInputProps('categories')
  const authorProps = getInputProps('author')
  const emailProps = getInputProps('email')
  const silenceVoiceChatProps = getInputProps('silenceVoiceChat', (e) => e.target.checked)
  const disablePortableExperiencesProps = getInputProps('disablePortableExperiences', (e) => e.target.checked)

  const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<EditorComponentsTypes['Scene']>(
    entity,
    Scene
  )

  const [spawnPoints, addSpawnPoint, modifySpawnPoint, removeSpawnPoint] = useArrayState<SceneSpawnPoint>(
    componentValue === null ? [] : componentValue.spawnPoints
  )

  const handleDrop = useCallback(async (thumbnail: string) => {
    const { operations } = sdk
    operations.updateValue(Scene, entity, { thumbnail })
    await operations.dispatch()
  }, [])

  const handleClick = useCallback(() => {
    setAuto(!auto)
  }, [auto])

  if (!hasScene) {
    return null
  }

  const handleAddSpawnPoint = useCallback(() => {
    addSpawnPoint({
      name: `Spawn Point ${spawnPoints.length + 1}`,
      default: true,
      position: {
        x: { $case: 'range', value: [0, 3] },
        y: { $case: 'range', value: [0, 0] },
        z: { $case: 'range', value: [0, 3] }
      },
      cameraTarget: { x: 8, y: 1, z: 8 }
    })
  }, [spawnPoints, addSpawnPoint])

  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (isComponentEqual({ ...componentValue, spawnPoints }) || isFocused) {
      return
    }

    setComponentValue({ ...componentValue, spawnPoints })
  }, [spawnPoints, isFocused, componentValue])

  const handleFocusInput = useCallback(
    ({ type }: React.FocusEvent<HTMLInputElement>) => {
      if (type === 'focus') {
        setIsFocused(true)
      } else {
        setIsFocused(false)
      }
    },
    [setIsFocused]
  )

  const handleBlurInput = useCallback(() => {
    setIsFocused(false)
  }, [setIsFocused])

  const renderSpawnPoint = useCallback(
    (spawnPoint: SceneSpawnPoint, index: number) => {
      const input = fromSceneSpawnPoint(spawnPoint)
      return (
        <Block className="SpawnPointContainer" key={spawnPoint.name}>
          <Block className="RightContent">
            <MoreOptionsMenu>
              <Button className="RemoveButton" onClick={() => removeSpawnPoint(index)}>
                Delete
              </Button>
            </MoreOptionsMenu>
          </Block>
          <Block label="Position">
            <TextField
              leftLabel="X"
              type="number"
              value={input.position.x}
              onFocus={handleFocusInput}
              onBlur={handleBlurInput}
              onChange={(event) => {
                const value = parseFloat(event.target.value)
                if (isNaN(value)) return
                const newInput = { ...input, position: { ...input.position, x: value } }
                modifySpawnPoint(index, toSceneSpawnPoint(spawnPoint.name, newInput))
              }}
            />
            <TextField
              leftLabel="Y"
              type="number"
              value={input.position.y}
              onFocus={handleFocusInput}
              onBlur={handleBlurInput}
              onChange={(event) => {
                const value = parseFloat(event.target.value)
                if (isNaN(value)) return
                const newInput = { ...input, position: { ...input.position, y: value } }
                modifySpawnPoint(index, toSceneSpawnPoint(spawnPoint.name, newInput))
              }}
            />
            <TextField
              leftLabel="Z"
              type="number"
              value={input.position.z}
              onFocus={handleFocusInput}
              onBlur={handleBlurInput}
              onChange={(event) => {
                const value = parseFloat(event.target.value)
                if (isNaN(value)) return
                const newInput = { ...input, position: { ...input.position, z: value } }
                modifySpawnPoint(index, toSceneSpawnPoint(spawnPoint.name, newInput))
              }}
            />
          </Block>
          <CheckboxField
            label="Random Offset"
            checked={input.randomOffset}
            onChange={(event) => {
              const newInput = { ...input, randomOffset: event.target.checked }
              if (!event.target.checked) {
                newInput.maxOffset = 0
              } else {
                newInput.maxOffset = 1.5
              }
              modifySpawnPoint(index, toSceneSpawnPoint(spawnPoint.name, newInput))
            }}
          />
          {input.randomOffset ? (
            <TextField
              label="Max Offset"
              type="number"
              value={input.maxOffset}
              onFocus={handleFocusInput}
              onBlur={handleBlurInput}
              onChange={(event) => {
                const value = parseFloat(event.target.value)
                if (isNaN(value)) return
                const newInput = { ...input, maxOffset: value }
                modifySpawnPoint(index, toSceneSpawnPoint(spawnPoint.name, newInput))
              }}
            />
          ) : null}
          <Block label="Camera Target">
            <TextField
              leftLabel="X"
              type="number"
              value={input.cameraTarget.x}
              onFocus={handleFocusInput}
              onBlur={handleBlurInput}
              onChange={(event) => {
                const value = parseFloat(event.target.value)
                if (isNaN(value)) return
                const newInput = { ...input, cameraTarget: { ...input.cameraTarget, x: value } }
                modifySpawnPoint(index, toSceneSpawnPoint(spawnPoint.name, newInput))
              }}
            />
            <TextField
              leftLabel="Y"
              type="number"
              value={input.cameraTarget.y}
              onFocus={handleFocusInput}
              onBlur={handleBlurInput}
              onChange={(event) => {
                const value = parseFloat(event.target.value)
                if (isNaN(value)) return
                const newInput = { ...input, cameraTarget: { ...input.cameraTarget, y: value } }
                modifySpawnPoint(index, toSceneSpawnPoint(spawnPoint.name, newInput))
              }}
            />
            <TextField
              leftLabel="Z"
              type="number"
              value={input.cameraTarget.z}
              onFocus={handleFocusInput}
              onBlur={handleBlurInput}
              onChange={(event) => {
                const value = parseFloat(event.target.value)
                if (isNaN(value)) return
                const newInput = { ...input, cameraTarget: { ...input.cameraTarget, z: value } }
                modifySpawnPoint(index, toSceneSpawnPoint(spawnPoint.name, newInput))
              }}
            />
          </Block>
        </Block>
      )
    },
    [modifySpawnPoint, removeSpawnPoint]
  )

  const hiddenSceneInspectorTabs = useAppSelector(getHiddenSceneInspectorTabs)
  const selectedSceneInspectorTab = useAppSelector(getSelectedSceneInspectorTab)
  const dispatch = useAppDispatch()

  const thumbnails = useAppSelector(selectThumbnails)
  const getThumbnail = useCallback(
    (value: string) => {
      const [name] = value.split('.')
      const thumbnail = thumbnails.find(($) => $.path.endsWith(name + '.png'))
      if (thumbnail) {
        return thumbnail?.content
      }
    },
    [thumbnails]
  )

  const renderThumbnail = useCallback(() => {
    const filename = thumbnailProps.value ? (thumbnailProps.value as unknown as string).split('/').pop() : null
    if (filename) {
      const thumbnail = getThumbnail(filename)
      if (thumbnail) {
        return <img src={transformBinaryToBase64Resource(thumbnail)} alt={filename} />
      }
    }
    return <IoIosImage />
  }, [thumbnailProps.value, getThumbnail])

  const handleSelectTab = useCallback(
    (tab: SceneInspectorTab) => {
      if (tab === selectedSceneInspectorTab) {
        return
      }
      dispatch(selectSceneInspectorTab({ tab }))
    },
    [selectedSceneInspectorTab, dispatch]
  )

  return (
    <Container className="Scene" gap>
      <Tabs className="SceneTabs">
        {hiddenSceneInspectorTabs[SceneInspectorTab.DETAILS] ? null : (
          <Tab
            active={selectedSceneInspectorTab === SceneInspectorTab.DETAILS}
            onClick={() => handleSelectTab(SceneInspectorTab.DETAILS)}
          >
            <i className="TabIcon details-icon" />
            &nbsp;Details
          </Tab>
        )}
        {hiddenSceneInspectorTabs[SceneInspectorTab.LAYOUT] ? null : (
          <Tab
            active={selectedSceneInspectorTab === SceneInspectorTab.LAYOUT}
            onClick={() => handleSelectTab(SceneInspectorTab.LAYOUT)}
          >
            <i className="TabIcon layout-icon" />
            &nbsp;Layout
          </Tab>
        )}
        {hiddenSceneInspectorTabs[SceneInspectorTab.SETTINGS] ? null : (
          <Tab
            active={selectedSceneInspectorTab === SceneInspectorTab.SETTINGS}
            onClick={() => handleSelectTab(SceneInspectorTab.SETTINGS)}
          >
            <i className="TabIcon cog-icon" />
            &nbsp;Settings
          </Tab>
        )}
      </Tabs>
      {selectedSceneInspectorTab === SceneInspectorTab.DETAILS ? (
        <>
          <TextField label="Name" {...nameProps} />
          <TextArea label="Description" {...descriptionProps} />
          <span className="ThumbnailRow">
            <div className="thumbnail">{renderThumbnail()}</div>
            <FileUploadField
              {...thumbnailProps}
              label="Thumbnail"
              accept={ACCEPTED_FILE_TYPES['image']}
              onDrop={handleDrop}
              isValidFile={isImage}
              showPreview
            />
          </span>
          <Dropdown label="Age Rating" options={AGE_RATING_OPTIONS} {...ageRatingProps} />
          <Dropdown
            label="Categories"
            options={CATEGORIES_OPTIONS}
            multiple
            {...categoriesProps}
            onChange={(event) => {
              if ((event.target.value as unknown as string[]).length > 3) {
                return
              }
              categoriesProps.onChange!(event)
            }}
          />
          <TextField label="Author (optional)" {...authorProps} />
          <TextField label="Email (optional)" {...emailProps} />
        </>
      ) : null}

      {selectedSceneInspectorTab === SceneInspectorTab.LAYOUT ? (
        <Block label="Parcels">
          <TextField {...parcelsProps} />
          <RxBorderAll onClick={handleClick} style={{ opacity: auto ? 1 : 0.3 }} />
        </Block>
      ) : null}

      {selectedSceneInspectorTab === SceneInspectorTab.SETTINGS ? (
        <>
          <Block label="Scene Restrictions" className="underlined"></Block>
          <CheckboxField
            label="Silence Voice Chat"
            checked={componentValue.silenceVoiceChat}
            {...silenceVoiceChatProps}
          />
          <CheckboxField
            label="Disable Portable Experiences"
            checked={componentValue.disablePortableExperiences}
            {...disablePortableExperiencesProps}
          />
          <Block label="Spawn Settings" className="underlined"></Block>
          {spawnPoints.map((spawnPoint, index) => renderSpawnPoint(spawnPoint, index))}
          <AddButton onClick={handleAddSpawnPoint}>Add Spawn Point</AddButton>
        </>
      ) : null}
    </Container>
  )
})
