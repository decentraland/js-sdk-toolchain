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
import { ENABLED_COMPONENTS, getSynchronizableComponents, getPotentialComponents, putComponentIds, deleteComponentIds } from './utils'
import { cleanPush } from '../../../lib/utils/array'
import type { Props } from './types'

import './SyncComponentsInspector.css'

export default withSdk<Props>(({ sdk, entity }) => {
  const { NetworkEntity, SyncComponents, GltfContainer } = sdk.components

  const hasSyncComponents = useHasComponent(entity, SyncComponents)
  const [componentValue, setComponentValue] = useComponentValue<ISyncComponentsType>(entity, SyncComponents)
  const entityComponents = getSynchronizableComponents(entity, sdk.engine)
  const potentialComponents = getPotentialComponents(entity, sdk.engine)

  useChange(({ entity: eventEntity, component, operation }) => {
    if (!hasSyncComponents) return
    if (eventEntity !== entity || !component || !ENABLED_COMPONENTS.has(component.componentName)) return

    const { componentIds } = componentValue

    if (operation === CrdtMessageType.PUT_COMPONENT) {
      setComponentValue({ componentIds: putComponentIds(sdk.engine, componentIds, component) })
    }

    if (operation === CrdtMessageType.DELETE_COMPONENT) {
      setComponentValue({ componentIds: deleteComponentIds(sdk.engine, entity, componentIds, component) })
    }
  }, [componentValue])

  useEffect(() => {
    const componentIds = [...entityComponents.map(($) => $.id), ...potentialComponents.map(($) => $.id)]
    setComponentValue({ componentIds })
  }, [hasSyncComponents])

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

  const handleChange = useCallback((componentId: number) => {
    if (componentValue.componentIds.includes(componentId)) {
      setComponentValue({ componentIds: componentValue.componentIds.filter(($) => $ !== componentId) })
    } else {
      setComponentValue({ componentIds: cleanPush(componentValue.componentIds, componentId) })
    }
  }, [componentValue])

  const noComponents = !entityComponents.length && !potentialComponents.length
  if (!hasSyncComponents || noComponents) return null

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
      <Block>
        {entityComponents.map(({ id, name }) => (
          <CheckboxField
            key={id}
            label={name}
            checked={componentValue.componentIds.includes(id)}
            onChange={() => handleChange(id)}
          />
        ))}
        {potentialComponents.length > 0 && (
          <>
            <span>Potential</span>
            {potentialComponents.map(({ id, name }) => (
              <CheckboxField
                key={id}
                label={name}
                checked={componentValue.componentIds.includes(id)}
                onChange={() => handleChange(id)}
              />
            ))}
          </>
        )}
      </Block>
    </Container>
  )
})
