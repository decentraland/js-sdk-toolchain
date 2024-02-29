import { useCallback, useEffect } from 'react'
import { CrdtMessageType, ISyncComponentsType } from '@dcl/ecs'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useChange } from '../../../hooks/sdk/useChange'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { CoreComponents } from '../../../lib/sdk/components'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { CheckboxField, InfoTooltip } from '../../ui'
import { ENABLED_COMPONENTS, getComponents, putComponentIds, deleteComponentIds, getThroughActionName } from './utils'
import { cleanPush } from '../../../lib/utils/array'
import type { Props } from './types'

import './SyncComponentsInspector.css'

export default withSdk<Props>(({ sdk, entity }) => {
  const { NetworkEntity, SyncComponents, GltfContainer } = sdk.components

  const hasSyncComponents = useHasComponent(entity, SyncComponents)
  const hasNetworkEntity = useHasComponent(entity, NetworkEntity)
  const [componentValue, setComponentValue] = useComponentValue<ISyncComponentsType>(entity, SyncComponents)
  const [entityComponents, availableComponents] = getComponents(entity, sdk.engine)

  useChange(({ entity: eventEntity, component, operation }) => {
    if (!hasSyncComponents) return
    if (eventEntity !== entity || !component || !ENABLED_COMPONENTS.has(component.componentName)) return

    const { componentIds } = componentValue

    const isNewComponent =
      operation === CrdtMessageType.PUT_COMPONENT &&
      !entityComponents.find(($) => $.id === component.componentId && !$.potential)

    if (isNewComponent) {
      setComponentValue({ componentIds: putComponentIds(sdk.engine, componentIds, component) })
    }

    if (operation === CrdtMessageType.DELETE_COMPONENT) {
      setComponentValue({ componentIds: deleteComponentIds(sdk.engine, entity, componentIds, component) })
    }
  }, [])

  useEffect(() => {
    if (!hasNetworkEntity && hasSyncComponents) {
      sdk.operations.addComponent(entity, NetworkEntity.componentId)
      sdk.operations.updateValue(NetworkEntity, entity, {
        entityId: sdk.enumEntity.getNextEnumEntityId(),
        networkId: 0
      })
      void sdk.operations.dispatch()
    }
  }, [entity, hasSyncComponents])

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, NetworkEntity)
    sdk.operations.removeComponent(entity, SyncComponents)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entity, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: CoreComponents.SYNC_COMPONENTS,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])

  const handleChange = useCallback(
    (componentId: number) => {
      if (componentValue.componentIds.includes(componentId)) {
        setComponentValue({ componentIds: componentValue.componentIds.filter(($) => $ !== componentId) })
      } else {
        setComponentValue({ componentIds: cleanPush(componentValue.componentIds, componentId) })
      }
    },
    [componentValue]
  )

  if (!hasSyncComponents || !entityComponents.length) return null

  return (
    <Container
      label="Multiplayer"
      className={cx('SyncComponents')}
      rightContent={
        <InfoTooltip
          text="Decentraland runs scenes locally in a player’s browser. By default, players are able to see each other and interact directly, but each player interacts with the environment independently. Changes in the environment aren’t shared between players by default. Seeing the same content in the same state is extremely important for players to interact in more meaningful ways."
          link="https://docs.decentraland.org/creator/development-guide/sdk7/serverless-multiplayer"
          type="help"
        />
      }
      onRemoveContainer={handleRemove}
    >
      Select the components of this item to sync so all users see the same changes in the scene.
      <Container label="Added components">
        <Block>
          {entityComponents.map(({ id, name, displayName, potential }) => (
            <CheckboxField
              key={id}
              label={displayName + (potential ? ` ${getThroughActionName(name)}` : '')}
              checked={componentValue.componentIds.includes(id)}
              onChange={() => handleChange(id)}
            />
          ))}
        </Block>
      </Container>
      <Container
        label="Other components"
        initialOpen={false}
        rightContent={
          <InfoTooltip
            text="All this components can by synced, but you need to add them to this item before selecting to sync"
            type="help"
          />
        }
      >
        <Block>
          {availableComponents.map(({ id, name }) => (
            <CheckboxField key={id} label={name} checked disabled />
          ))}
        </Block>
      </Container>
    </Container>
  )
})
