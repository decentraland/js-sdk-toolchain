import { Engine } from '../ecs/Engine'
import { UUIDEvent, PointerEvent, RaycastResponse } from './Events'
import { OnUUIDEvent } from './Components'
import {
  ISystem,
  ComponentAdded,
  ComponentRemoved,
  IEntity
} from '../ecs/IEntity'
import { Input } from './Input'
import {
  PhysicsCast,
  RaycastHitEntity,
  RaycastHitEntities
} from './PhysicsCast'

/**
 * @public
 */
export class RaycastEventSystem implements ISystem {
  activate(engine: Engine) {
    engine.eventManager.addListener(RaycastResponse, this, (event) => {
      if (event.payload.queryType === 'HitFirst') {
        PhysicsCast.instance.handleRaycastHitFirstResponse(
          event as RaycastResponse<RaycastHitEntity>
        )
      } else if (event.payload.queryType === 'HitAll') {
        PhysicsCast.instance.handleRaycastHitAllResponse(
          event as RaycastResponse<RaycastHitEntities>
        )
      }
    })

    if (typeof dcl !== 'undefined') {
      dcl.subscribe('raycastResponse')
    }
  }

  deactivate() {
    if (typeof dcl !== 'undefined') {
      dcl.unsubscribe('raycastResponse')
    }
  }
}

/**
 * @public
 */
export class PointerEventSystem implements ISystem {
  activate(engine: Engine) {
    engine.eventManager.addListener(PointerEvent, this, (event) => {
      Input.instance.handlePointerEvent(event.payload as GlobalInputEventResult)
    })

    if (typeof dcl !== 'undefined') {
      dcl.subscribe('pointerUp')
      dcl.subscribe('pointerDown')
      dcl.subscribe('actionButtonEvent')
    }
  }

  deactivate() {
    if (typeof dcl !== 'undefined') {
      dcl.unsubscribe('pointerUp')
      dcl.unsubscribe('pointerDown')
      dcl.unsubscribe('actionButtonEvent')
    }
  }
}

/**
 * @public
 */
export class UUIDEventSystem implements ISystem {
  handlerMap: { [uuid: string]: OnUUIDEvent<any> } = {}

  activate(engine: Engine) {
    engine.eventManager.addListener(UUIDEvent, this, this.handleEvent)
    engine.eventManager.addListener(ComponentAdded, this, this.componentAdded)
    engine.eventManager.addListener(
      ComponentRemoved,
      this,
      this.componentRemoved
    )

    if (typeof dcl !== 'undefined') {
      dcl.subscribe('uuidEvent')
    }
  }

  deactivate() {
    if (typeof dcl !== 'undefined') {
      dcl.unsubscribe('uuidEvent')
    }
  }

  onAddEntity(entity: IEntity) {
    for (const componentName in entity.components) {
      const component = entity.components[componentName]

      if (component instanceof OnUUIDEvent) {
        this.handlerMap[component.uuid] = component
      }
    }
  }

  onRemoveEntity(entity: IEntity) {
    for (const componentName in entity.components) {
      const component = entity.components[componentName]

      if (component instanceof OnUUIDEvent) {
        delete this.handlerMap[component.uuid]
      }
    }
  }

  private componentAdded(event: ComponentAdded) {
    if (event.entity.isAddedToEngine()) {
      const component = event.entity.components[event.componentName]

      if (component instanceof OnUUIDEvent) {
        this.handlerMap[component.uuid] = component
      }
    }
  }

  private componentRemoved(event: ComponentRemoved) {
    if (event.entity.isAddedToEngine()) {
      if (event.component instanceof OnUUIDEvent) {
        delete this.handlerMap[event.component.uuid]
      }
    }
  }

  private handleEvent(event: UUIDEvent): void {
    if (event.uuid in this.handlerMap) {
      const handler = this.handlerMap[event.uuid]
      if (handler) {
        if (handler.callback && 'call' in handler.callback) {
          handler.callback(event.payload)
        }
      }
    }
  }
}

/** @internal */
export const raycastEventSystem = new RaycastEventSystem()

/** @internal */
export const pointerEventSystem = new PointerEventSystem()

/** @internal */
export const uuidEventSystem = new UUIDEventSystem()
