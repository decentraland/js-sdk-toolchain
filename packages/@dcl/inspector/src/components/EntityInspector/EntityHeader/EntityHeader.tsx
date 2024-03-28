import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AiOutlinePlus as AddIcon } from 'react-icons/ai'
import { VscSettings as SettingsIcon, VscDebugRestart as RevertIcon, VscClose as CloseIcon } from 'react-icons/vsc'
import { IoMdInformationCircleOutline as InfoIcon } from 'react-icons/io'

import { Entity } from '@dcl/ecs'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useChange } from '../../../hooks/sdk/useChange'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { isRoot, useEntityComponent } from '../../../hooks/sdk/useEntityComponent'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { CAMERA, PLAYER, ROOT } from '../../../lib/sdk/tree'
import { getAssetByModel, getAssetById } from '../../../lib/logic/catalog'
import { analytics, Event } from '../../../lib/logic/analytics'
import { EditorComponentsTypes } from '../../../lib/sdk/components'
import { SdkContextEvents, SdkContextValue } from '../../../lib/sdk/context'

import { Button } from '../../Button'
import { Modal } from '../../Modal'
import { Dropdown } from '../../ui'

import MoreOptionsMenu from '../MoreOptionsMenu'
import { RemoveButton } from '../RemoveButton'

import './EntityHeader.css'

interface ModalState {
  isOpen: boolean
  cb?: () => void
}

const getLabel = (sdk: SdkContextValue, entity: Entity) => {
  const nameComponent = sdk.components.Name.getOrNull(entity)
  switch (entity) {
    case ROOT:
      return 'Scene'
    case PLAYER:
      return 'Player'
    case CAMERA:
      return 'Camera'
    default:
      return nameComponent && nameComponent.value.length > 0
        ? nameComponent.value
        : entity
        ? entity.toString()
        : 'Unknown'
  }
}

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity }>(({ sdk, entity }) => {
    const { addComponent, getAvailableComponents } = useEntityComponent()
    const [configComponent, setConfigComponentValue] = useComponentValue<EditorComponentsTypes['Config']>(
      entity,
      sdk.components.Config
    )
    const [label, setLabel] = useState<string | null>()
    const [modal, setModal] = useState<ModalState>({ isOpen: false })

    useEffect(() => {
      setLabel(getLabel(sdk, entity))
    }, [sdk, entity])

    const handleUpdate = (event: SdkContextEvents['change']) => {
      if (event.entity === entity && event.component === sdk.components.Name) {
        setLabel(getLabel(sdk, entity))
      }
    }

    useChange(handleUpdate, [entity])

    const hasGltfContainer = useHasComponent(entity, sdk.components.GltfContainer)
    const hasMeshCollider = useHasComponent(entity, sdk.components.MeshCollider)
    const hasConfigComponent = useHasComponent(entity, sdk.components.Config)
    const isBasicViewEnabled = useMemo(() => configComponent.isBasicViewEnabled === true, [configComponent])

    const handleAddComponent = useCallback(
      (componentId: number, componentName: string, value?: any) => {
        addComponent(entity, componentId, value)
        const { src: gltfSrc } = sdk.components.GltfContainer.getOrNull(entity) ?? { src: '' }
        const asset = getAssetByModel(gltfSrc)
        analytics.track(Event.ADD_COMPONENT, {
          componentName: componentName,
          itemId: asset?.id,
          itemPath: gltfSrc
        })
      },
      [entity]
    )

    const isComponentDisabled = useCallback(
      (component: string) => {
        switch (component) {
          case 'Visibility': {
            return !hasGltfContainer && !hasMeshCollider
          }
          default:
            return false
        }
      },
      [entity, hasGltfContainer, hasMeshCollider]
    )

    const availableComponents = getAvailableComponents(entity)

    const handleOpenModal = useCallback(
      (cb?: () => void) => {
        setModal({ isOpen: true, cb })
      },
      [setModal]
    )

    const handleCloseModal = useCallback(() => {
      setModal({ isOpen: false, cb: undefined })
    }, [setModal])

    const handleClickAddComponent = useCallback(
      (componentId: number, componentName: string, value?: any) => {
        if (isBasicViewEnabled) {
          handleOpenModal(() => handleAddComponent(componentId, componentName, value))
          return
        }
        handleAddComponent(componentId, componentName, value)
      },
      [isBasicViewEnabled, handleAddComponent, handleOpenModal]
    )

    const componentOptions = useMemo(() => {
      const options = [
        { header: '3D Content' },
        {
          id: sdk.components.GltfContainer.componentId,
          value: 'GLTF',
          onClick: () =>
            handleClickAddComponent(
              sdk.components.GltfContainer.componentId,
              sdk.components.GltfContainer.componentName
            ),
          tooltip: {
            text: "The GLTF assigns a 3D model file for the item's visible shape. It also handles collisions, to make an item clickable or block the player from walking through it."
          }
        },
        {
          id: sdk.components.Material.componentId,
          value: 'Material',
          onClick: () =>
            handleClickAddComponent(sdk.components.Material.componentId, sdk.components.Material.componentName),
          tooltip: {
            text: 'Material determines the visual appearance of an object. It defines properties such as color, texture, and transparency',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/materials/'
          }
        },
        {
          id: sdk.components.VisibilityComponent.componentId,
          value: 'Visibility',
          onClick: () =>
            handleClickAddComponent(
              sdk.components.VisibilityComponent.componentId,
              sdk.components.VisibilityComponent.componentName
            ),
          tooltip: {
            className: 'EntityHeader',
            text: (
              <span className="VisibilityComponentTooltip">
                Visibility controls whether an object is visible or not to the player. Items marked as invisible are
                shown on the editor, but not to players running the scene.
                {isComponentDisabled('Visibility') && (
                  <span className="ErrorMessage">
                    You must have either a GLTF Container or a Mesh Collider component to use this component.
                  </span>
                )}
              </span>
            )
          },
          disabled: isComponentDisabled('Visibility')
        },
        {
          id: sdk.components.MeshRenderer.componentId,
          value: 'Mesh Renderer',
          onClick: () =>
            handleClickAddComponent(sdk.components.MeshRenderer.componentId, sdk.components.MeshRenderer.componentName),
          tooltip: {
            text: 'Use MeshRenderer to assign a primitive 3D shape to the item. Instead of using a 3D file from GLTF, assign a simple cube, plane, sphere, or cylinder. These shapes can be used together with Materials',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/shape-components/'
          }
        },
        {
          id: sdk.components.MeshCollider.componentId,
          value: 'Mesh Collider',
          onClick: () =>
            handleClickAddComponent(sdk.components.MeshCollider.componentId, sdk.components.MeshCollider.componentName),
          tooltip: {
            text: 'MeshCollider defines the collision properties of an item, based on its invisible collision geometry. Collisions serve to make an item clickable or to block the player from walking through an item',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/colliders/'
          }
        },
        { header: 'Interaction' },
        {
          id: sdk.components.States.componentId,
          value: 'States',
          onClick: () =>
            handleClickAddComponent(sdk.components.States.componentId, sdk.components.States.componentName),
          tooltip: {
            text: 'States specify the status of entities. Use triggers to check or change states, and set actions accordingly.',
            link: 'https://docs.decentraland.org/creator/smart-items/#states'
          }
        },
        {
          id: sdk.components.Triggers.componentId,
          value: 'Triggers',
          onClick: () =>
            handleClickAddComponent(sdk.components.Triggers.componentId, sdk.components.Triggers.componentName),
          tooltip: {
            text: 'Triggers activate actions based on player interactions like clicks, entering/exiting areas, or global events like "on spawn".',
            link: 'https://docs.decentraland.org/creator/smart-items/#triggers'
          }
        },
        {
          id: sdk.components.Actions.componentId,
          value: 'Actions',
          onClick: () =>
            handleClickAddComponent(sdk.components.Actions.componentId, sdk.components.Actions.componentName),
          tooltip: {
            text: 'Actions list the capabilities of entities, from playing animations to changing visibility. Customize or add new actions, which are activated by triggers.',
            link: 'https://docs.decentraland.org/creator/smart-items/#actions'
          }
        },
        {
          id: sdk.components.AudioSource.componentId,
          value: 'Audio Source',
          onClick: () =>
            handleClickAddComponent(sdk.components.AudioSource.componentId, sdk.components.AudioSource.componentName),
          tooltip: {
            text: 'AudioSource enables the playback of sound in your scene. The item emits sound that originates from its location, from an .mp3 file in your scene project',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/sounds'
          }
        },
        {
          id: sdk.components.TextShape.componentId,
          value: 'Text Shape',
          onClick: () =>
            handleClickAddComponent(sdk.components.TextShape.componentId, sdk.components.TextShape.componentName),
          tooltip: {
            text: 'Use TextShape to display text in the 3D space',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/text'
          }
        },
        {
          id: sdk.components.PointerEvents.componentId,
          value: 'Pointer Events',
          onClick: () =>
            handleClickAddComponent(
              sdk.components.PointerEvents.componentId,
              sdk.components.PointerEvents.componentName
            ),
          tooltip: {
            text: 'Use PointerEvents to configure the hints shown to players when they hover the cursor over the item. Change the text, the button, the max distance, etc',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/click-events'
          }
        }
      ]

      const optionIds = options.reduce((set, option) => {
        if (!option.header && option.id) {
          set.add(option.id)
        }
        return set
      }, new Set<number>())

      const availableIds = availableComponents.reduce((set, component) => set.add(component.id), new Set<number>())

      if (availableComponents.some((component) => !optionIds.has(component.id))) {
        options.push({ header: 'Other' })
        for (const component of availableComponents) {
          if (!optionIds.has(component.id)) {
            options.push({
              id: component.id,
              value: component.name,
              onClick: () => handleClickAddComponent(component.id, component.name)
            } as any)
          }
        }
      }

      return options.filter((option) => !option.id || availableIds.has(option.id))
    }, [sdk, availableComponents, isComponentDisabled, handleClickAddComponent])

    const handleRemoveEntity = useCallback(async () => {
      sdk.operations.removeEntity(entity)
      await sdk.operations.dispatch()
    }, [entity, sdk])

    const handleTrackSwitchToAdvanceView = useCallback(
      (isAdvancedView: boolean) => {
        const asset = getAssetById(configComponent.assetId!)
        if (asset) {
          analytics.track(Event.SWITCH_BUILDER_MODE, {
            itemId: asset.id,
            itemName: asset.name,
            isAdvancedView: isAdvancedView
          })
        }
      },
      [entity, analytics]
    )

    const handleEnableAdvancedMode = useCallback(async () => {
      if (modal.cb) {
        modal.cb()
      }
      setConfigComponentValue({ ...configComponent, isBasicViewEnabled: false })
      await sdk.operations.dispatch()
      handleTrackSwitchToAdvanceView(true)
      handleCloseModal()
    }, [sdk, configComponent, modal, setConfigComponentValue, handleCloseModal, handleTrackSwitchToAdvanceView])

    const handleEnableBasicMode = useCallback(async () => {
      setConfigComponentValue({ ...configComponent, isBasicViewEnabled: true })
      await sdk.operations.dispatch()
      handleTrackSwitchToAdvanceView(false)
      handleCloseModal()
    }, [sdk, configComponent, setConfigComponentValue, handleCloseModal, handleTrackSwitchToAdvanceView])

    const renderToggleAdvanceMode = useCallback(() => {
      return (
        <Button className="AdvancedModeButton" onClick={() => handleOpenModal()}>
          {isBasicViewEnabled ? (
            <>
              <SettingsIcon /> Enable Advanced Mode
            </>
          ) : (
            <>
              <RevertIcon /> Revert to Basic Mode
            </>
          )}
        </Button>
      )
    }, [isBasicViewEnabled, handleOpenModal])

    const renderModalContent = useCallback(() => {
      if (isBasicViewEnabled) {
        return (
          <>
            <h2>
              Enable <strong>Advanced Mode</strong>
            </h2>
            {!!modal.cb ? (
              <p>
                Advanced Mode enables complete customization, allowing you to{' '}
                <strong>add or modify actions, triggers, and states</strong> of this smart item.
              </p>
            ) : (
              <p>To incorporate additional components to this item, the activation of Advanced Mode is required.</p>
            )}
            <p>
              Reverting to Basic Mode later <strong>will not retain any changes made in Advanced Mode</strong>.
            </p>
            <p>Are you sure you want to continue?</p>
          </>
        )
      }

      return (
        <>
          <h2>
            Revert to <strong>Basic Mode</strong>
          </h2>
          <p>
            You are about to <strong>reset this smart item to its original settings</strong>.
          </p>
          <p>
            This action will undo all customizations made in Advanced Mode and return the item to its default basic
            configuration.
          </p>
          <p>Are you sure you want to rever to Basic Mode?</p>
        </>
      )
    }, [modal, isBasicViewEnabled])

    const renderModalActions = useCallback(() => {
      if (isBasicViewEnabled) {
        return (
          <>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button className="primary" onClick={handleEnableAdvancedMode}>
              Enable Advanced Mode
            </Button>
          </>
        )
      }

      return (
        <>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button className="primary" onClick={handleEnableBasicMode}>
            Revert to Basic Mode
          </Button>
        </>
      )
    }, [isBasicViewEnabled, handleCloseModal, handleEnableAdvancedMode, handleEnableBasicMode])

    return (
      <div className="EntityHeader">
        {label}
        <div className="RightContent">
          {componentOptions.some((option) => !option.header) ? (
            <Dropdown className="AddComponent" options={componentOptions} trigger={<AddIcon />} />
          ) : null}
          {!isRoot(entity) ? (
            <MoreOptionsMenu>
              {hasConfigComponent ? renderToggleAdvanceMode() : <></>}
              <RemoveButton className="RemoveButton" onClick={handleRemoveEntity}>
                Delete Entity
              </RemoveButton>
            </MoreOptionsMenu>
          ) : null}
        </div>
        <Modal
          isOpen={!!modal.isOpen}
          onRequestClose={handleCloseModal}
          className="ToggleBasicViewModal"
          overlayClassName="EntityHeader"
        >
          <InfoIcon size={48} color="#3794ff" />
          <div className="ModalBody">
            <CloseIcon className="CloseIcon" size={16} color="#cccccc" onClick={handleCloseModal} />
            <div className="ModalContent">{renderModalContent()}</div>
            <div className="ModalActions">{renderModalActions()}</div>
          </div>
        </Modal>
      </div>
    )
  })
)
