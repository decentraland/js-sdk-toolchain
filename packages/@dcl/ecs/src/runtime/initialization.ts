/// <reference types="@dcl/posix" />

/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { ActionButton } from '../components/generated/pb/decentraland/sdk/components/common/action_button.gen'
import { PointerEventType } from '../components/generated/pb/decentraland/sdk/components/pointer_events.gen'
import { Engine, Entity } from '../engine'
import {
  isPointerEventActiveGenerator,
  wasEntityClickedGenerator
} from '../engine/events'
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

let wasEntityClickedFunc:
  | ((entity: Entity, actionButton: ActionButton) => boolean)
  | null = null

/**
 * Check if an entity emitted a clicked event
 * @param entity the entity to query, for global clicks use `engine.RootEntity`
 * @param actionButton
 * @returns true if the entity was clicked in the last tick-update
 */
export function wasEntityClicked(entity: Entity, actionButton: ActionButton) {
  if (!wasEntityClickedFunc) {
    wasEntityClickedFunc = wasEntityClickedGenerator(engine)
  }
  return wasEntityClickedFunc(entity, actionButton)
}

let isPointerEventActiveFunc:
  | ((
      entity: Entity,
      actionButton: ActionButton,
      pointerEventType: PointerEventType
    ) => boolean)
  | null = null

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
  if (!isPointerEventActiveFunc) {
    isPointerEventActiveFunc = isPointerEventActiveGenerator(engine)
  }
  return isPointerEventActiveFunc(entity, actionButton, pointerEventType)
}
