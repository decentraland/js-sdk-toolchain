import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AiOutlinePlus as AddIcon } from 'react-icons/ai'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { Entity } from '@dcl/ecs'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useChange } from '../../../hooks/sdk/useChange'
import { isRoot, useEntityComponent } from '../../../hooks/sdk/useEntityComponent'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { CAMERA, PLAYER, ROOT } from '../../../lib/sdk/tree'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { analytics, Event } from '../../../lib/logic/analytics'
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
    const { addComponent, getAvailableComponents } = useEntityComponent()
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
      (componentId: number, componentName: string) => {
        addComponent(entity, componentId)
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

    const componentOptions = useMemo(() => {
      const options = [
        { header: '3D Content' },
        {
          id: sdk.components.GltfContainer.componentId,
          value: 'GLTF',
          onClick: () =>
            handleAddComponent(sdk.components.GltfContainer.componentId, sdk.components.GltfContainer.componentName),
          tooltip: {
            text: "The GLTF assigns a 3D model file for the item's visible shape. It also handles collisions, to make an item clickable or block the player from walking through it."
          }
        },
        {
          id: sdk.components.Material.componentId,
          value: 'Material',
          onClick: () => handleAddComponent(sdk.components.Material.componentId, sdk.components.Material.componentName),
          tooltip: {
            text: 'Material determines the visual appearance of an object. It defines properties such as color, texture, and transparency',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/materials/'
          }
        },
        {
          id: sdk.components.VisibilityComponent.componentId,
          value: 'Visibility',
          onClick: () =>
            handleAddComponent(
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
            handleAddComponent(sdk.components.MeshRenderer.componentId, sdk.components.MeshRenderer.componentName),
          tooltip: {
            text: 'Use MeshRenderer to assign a primitive 3D shape to the item. Instead of using a 3D file from GLTF, assign a simple cube, plane, sphere, or cylinder. These shapes can be used together with Materials',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/shape-components/'
          }
        },
        {
          id: sdk.components.MeshCollider.componentId,
          value: 'Mesh Collider',
          onClick: () =>
            handleAddComponent(sdk.components.MeshCollider.componentId, sdk.components.MeshCollider.componentName),
          tooltip: {
            text: 'MeshCollider defines the collision properties of an item, based on its invisible collision geometry. Collisions serve to make an item clickable or to block the player from walking through an item',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/colliders/'
          }
        },
        { header: 'Interaction' },
        {
          id: sdk.components.States.componentId,
          value: 'States',
          onClick: () => handleAddComponent(sdk.components.States.componentId, sdk.components.States.componentName),
          tooltip: {
            text: 'States specify the status of entities. Use triggers to check or change states, and set actions accordingly.',
            link: 'https://docs.decentraland.org/creator/smart-items/#states'
          }
        },
        {
          id: sdk.components.Triggers.componentId,
          value: 'Triggers',
          onClick: () => handleAddComponent(sdk.components.Triggers.componentId, sdk.components.Triggers.componentName),
          tooltip: {
            text: 'Triggers activate actions based on player interactions like clicks, entering/exiting areas, or global events like "on spawn".',
            link: 'https://docs.decentraland.org/creator/smart-items/#triggers'
          }
        },
        {
          id: sdk.components.Actions.componentId,
          value: 'Actions',
          onClick: () => handleAddComponent(sdk.components.Actions.componentId, sdk.components.Actions.componentName),
          tooltip: {
            text: 'Actions list the capabilities of entities, from playing animations to changing visibility. Customize or add new actions, which are activated by triggers.',
            link: 'https://docs.decentraland.org/creator/smart-items/#actions'
          }
        },
        {
          id: sdk.components.AudioSource.componentId,
          value: 'Audio Source',
          onClick: () =>
            handleAddComponent(sdk.components.AudioSource.componentId, sdk.components.AudioSource.componentName),
          tooltip: {
            text: 'AudioSource enables the playback of sound in your scene. The item emits sound that originates from its location, from an .mp3 file in your scene project',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/sounds'
          }
        },
        {
          id: sdk.components.TextShape.componentId,
          value: 'Text Shape',
          onClick: () =>
            handleAddComponent(sdk.components.TextShape.componentId, sdk.components.TextShape.componentName),
          tooltip: {
            text: 'Use TextShape to display text in the 3D space',
            link: 'https://docs.decentraland.org/creator/development-guide/sdk7/text'
          }
        },
        {
          id: sdk.components.PointerEvents.componentId,
          value: 'Pointer Eventers',
          onClick: () =>
            handleAddComponent(sdk.components.PointerEvents.componentId, sdk.components.PointerEvents.componentName),
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
              onClick: () => handleAddComponent(component.id, component.name)
            } as any)
          }
        }
      }

      return options.filter((option) => !option.id || availableIds.has(option.id))
    }, [sdk, isComponentDisabled, handleAddComponent, availableComponents])

    const handleRemoveEntity = useCallback(async () => {
      sdk.operations.removeEntity(entity)
      await sdk.operations.dispatch()
    }, [entity, sdk])

    return (
      <div className="EntityHeader">
        {label}
        <div className="RightContent">
          {componentOptions.some((option) => !option.header) ? (
            <Dropdown className="AddComponent" options={componentOptions} trigger={<AddIcon />} />
          ) : null}
          {!isRoot(entity) ? (
            <MoreOptionsMenu>
              <Button className="RemoveButton" onClick={handleRemoveEntity}>
                <RemoveIcon /> Delete Entity
              </Button>
            </MoreOptionsMenu>
          ) : null}
        </div>
      </div>
    )
  })
)
