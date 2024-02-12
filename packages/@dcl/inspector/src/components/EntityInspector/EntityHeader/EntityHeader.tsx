import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AiOutlinePlus as AddIcon } from 'react-icons/ai'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { Entity } from '@dcl/ecs'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useChange } from '../../../hooks/sdk/useChange'
import { useEntityComponent } from '../../../hooks/sdk/useEntityComponent'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { CAMERA, PLAYER, ROOT } from '../../../lib/sdk/tree'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { analytics, Event } from '../../../lib/logic/analytics'
import { Component } from '../../../lib/sdk/components'
import { SdkContextEvents, SdkContextValue } from '../../../lib/sdk/context'

import { Button } from '../../Button'
import { Dropdown } from '../../ui'
import MoreOptionsMenu from '../MoreOptionsMenu'

import './EntityHeader.css'

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
    const { addComponent } = useEntityComponent()
    const [label, setLabel] = useState<string | null>()

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

    const handleAddComponent = useCallback(
      (component: Component) => {
        addComponent(entity, component.componentId)
        const { src: gltfSrc } = sdk.components.GltfContainer.getOrNull(entity) ?? { src: '' }
        const asset = getAssetByModel(gltfSrc)
        analytics.track(Event.ADD_COMPONENT, {
          componentName: component.componentName,
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

    const componentOptions = useMemo(() => {
      return [
        { header: '3D Content' },
        {
          value: 'GLTF',
          onClick: () => handleAddComponent(sdk.components.GltfContainer),
          tooltip: {
            text: "The GLTF assigns a 3D model file for the item's visible shape. It also handles collisions, to make an item clickable or block the player from walking through it."
          }
        },
        {
          value: 'Material',
          onClick: () => handleAddComponent(sdk.components.Material),
          tooltip: {
            text: 'Material determines the visual appearance of an object. It defines properties such as color, texture, and transparency',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/materials/'
          }
        },
        {
          value: 'Visibility',
          onClick: () => handleAddComponent(sdk.components.VisibilityComponent),
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
          value: 'Mesh Renderer',
          onClick: () => handleAddComponent(sdk.components.MeshRenderer),
          tooltip: {
            text: 'Use MeshRenderer to assign a primitive 3D shape to the item. Instead of using a 3D file from GLTF, assign a simple cube, plane, sphere, or cylinder. These shapes can be used together with Materials',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/shape-components/'
          }
        },
        {
          value: 'Mesh Collider',
          onClick: () => handleAddComponent(sdk.components.MeshCollider),
          tooltip: {
            text: 'MeshCollider defines the collision properties of an item, based on its invisible collision geometry. Collisions serve to make an item clickable or to block the player from walking through an item',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/colliders/'
          }
        },
        { header: 'Interaction' },
        {
          value: 'States',
          onClick: () => handleAddComponent(sdk.components.States),
          tooltip: {
            text: 'States specify the status of entities. Use triggers to check or change states, and set actions accordingly.',
            link: 'https://docs.decentraland.org/creator/smart-items/#states'
          }
        },
        {
          value: 'Triggers',
          onClick: () => handleAddComponent(sdk.components.Triggers),
          tooltip: {
            text: 'Triggers activate actions based on player interactions like clicks, entering/exiting areas, or global events like "on spawn".',
            link: 'https://docs.decentraland.org/creator/smart-items/#triggers'
          }
        },
        {
          value: 'Actions',
          onClick: () => handleAddComponent(sdk.components.Actions),
          tooltip: {
            text: 'Actions list the capabilities of entities, from playing animations to changing visibility. Customize or add new actions, which are activated by triggers.',
            link: 'https://docs.decentraland.org/creator/smart-items/#actions'
          }
        },
        {
          value: 'Audio Source',
          onClick: () => handleAddComponent(sdk.components.AudioSource),
          tooltip: {
            text: 'AudioSource enables the playback of sound in your scene. The item emits sound that originates from its location, from an .mp3 file in your scene project',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/sounds'
          }
        },
        {
          value: 'Text Shape',
          onClick: () => handleAddComponent(sdk.components.TextShape),
          tooltip: {
            text: 'Use TextShape to display text in the 3D space',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/text'
          }
        },
        {
          value: 'Pointer Eventers',
          onClick: () => handleAddComponent(sdk.components.PointerEvents),
          tooltip: {
            text: 'Use PointerEvents to configure the hints shown to players when they hover the cursor over the item. Change the text, the button, the max distance, etc',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/click-events'
          }
        }
      ]
    }, [sdk, isComponentDisabled, handleAddComponent])

    const handleRemoveEntity = useCallback(async () => {
      sdk.operations.removeEntity(entity)
      await sdk.operations.dispatch()
    }, [entity, sdk])

    return (
      <div className="EntityHeader">
        {label}
        {entity !== ROOT && (
          <div className="RightContent">
            <Dropdown className="AddComponent" options={componentOptions} trigger={<AddIcon />} />
            <MoreOptionsMenu>
              <Button className="RemoveButton" onClick={handleRemoveEntity}>
                <RemoveIcon /> Delete Entity
              </Button>
            </MoreOptionsMenu>
          </div>
        )}
      </div>
    )
  })
)
