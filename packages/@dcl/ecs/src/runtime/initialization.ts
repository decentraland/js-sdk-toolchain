/// <reference types="@dcl/posix" />

/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { ActionButton } from '../components/generated/pb/ecs/components/common/ActionButton.gen'
import { PointerEventType } from '../components/generated/pb/ecs/components/PointerEvents.gen'
import { Engine, Entity } from '../engine'
import { createInput } from '../engine/input'
import { createNetworkTransport } from '../systems/crdt/transports/networkTransport'
import { createRendererTransport } from '../systems/crdt/transports/rendererTransport'
import { _initEventObservables } from './observables'

const rendererTransport = createRendererTransport()
export const engine = Engine({
  transports: [rendererTransport, createNetworkTransport()]
})

if (typeof dcl !== 'undefined') {
  dcl.loadModule('~system/ExperimentalAPI', {}).catch(dcl.error)

  async function pullRendererMessages() {
    const response = await dcl.callRpc(
      '~system/ExperimentalAPI',
      'messageFromRenderer',
      []
    )

    if (response.data?.length) {
      if (rendererTransport.onmessage) {
        for (const byteArray of response.data) {
          rendererTransport.onmessage(byteArray)
        }
      }
    }
  }

  dcl.onUpdate((dt: number) => {
    pullRendererMessages()
      .catch(dcl.error)
      .finally(() => engine.update(dt))
  })

  _initEventObservables()
}

export const log = dcl.log
export const error = dcl.error

export const Input = createInput(engine)

/**
 * Check if an entity emitted a clicked event
 * @param entity the entity to query, for global clicks use `engine.RootEntity`
 * @param actionButton
 * @returns true if the entity was clicked in the last tick-update
 */
export function wasEntityClicked(entity: Entity, actionButton: ActionButton) {
  return Input.isClicked(actionButton, entity)
}

/**
 * Check if a pointer event has been emited in the last tick-update.
 * @param entity the entity to query, for global clicks use `engine.RootEntity`
 * @param actionButton
 * @param pointerEventType
 * @returns
 */
export function isPointerEventActive(
  entity: Entity,
  actionButton: ActionButton,
  pointerEventType: PointerEventType
) {
  return Input.isInputActive(actionButton, pointerEventType, entity)
}
