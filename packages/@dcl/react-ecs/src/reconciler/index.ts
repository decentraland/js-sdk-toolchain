import {
  Entity,
  IEngine,
  EventSystemCallback,
  PointerEventsSystem,
  InputAction
} from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import Reconciler, { HostConfig } from 'react-reconciler'
import { isListener, Listeners } from '../components'
import { CANVAS_ROOT_ENTITY } from '../components/uiTransform'
import { JSX } from '../react-ecs'
import {
  Changes,
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
  _ChildSet,
  TimeoutHandle,
  NoTimeout,
  OpaqueHandle,
  EngineComponents
} from './types'
import {
  componentKeys,
  isNotUndefined,
  noopConfig,
  propsChanged
} from './utils'

type OnChangeState = { fn: (val?: string) => void; timestamp?: number }
export function createReconciler(
  engine: Pick<
    IEngine,
    | 'getComponent'
    | 'addEntity'
    | 'removeEntity'
    | 'defineComponentFromSchema'
    | 'getEntitiesWith'
    | 'getLamportTimestampOrNull'
  >,
  pointerEvents: PointerEventsSystem
) {
  const entities = new Set<Entity>()
  const UiTransform = components.UiTransform(engine)
  const UiText = components.UiText(engine)
  const UiBackground = components.UiBackground(engine)
  const UiInput = components.UiInput(engine)
  const UiInputResult = components.UiInputResult(engine)
  const changeEvents = new Map<Entity, Map<number, OnChangeState | undefined>>()
  const getComponentId: {
    [key in keyof EngineComponents]: number
  } = {
    uiTransform: UiTransform._id,
    uiText: UiText._id,
    uiBackground: UiBackground._id,
    uiInput: UiInput._id
  }

  function updateTree(
    instance: Instance,
    props: Partial<{ rightOf: Entity; parent: Entity }>
  ) {
    upsertComponent(
      instance,
      props as { rightOf: number; parent: number },
      'uiTransform'
    )
  }

  function upsertListener(
    instance: Instance,
    update: Changes<keyof Listeners>
  ) {
    // TODO: This handles only onClick listener for the moment
    if (update.type === 'delete' || !update.props) {
      pointerEvents.removeOnPointerDown(instance.entity)
      return
    }

    if (update.props) {
      pointerEvents.onPointerDown(
        instance.entity,
        update.props as EventSystemCallback,
        {
          button: InputAction.IA_POINTER,
          hoverText: ''
        }
      )
    }
  }

  function removeComponent<K extends keyof EngineComponents>(
    instance: Instance,
    component: keyof EngineComponents,
    props: Partial<EngineComponents[K]>
  ) {
    const componentId = getComponentId[component]
    const Component = engine.getComponent(componentId)
    Component.deleteFrom(instance.entity)
    if ('onChange' in props) {
      updateOnChange(instance.entity, componentId, undefined)
    }
  }

  function upsertComponent<K extends keyof EngineComponents>(
    instance: Instance,
    props: Partial<EngineComponents[K]>,
    componentName: K
  ) {
    const componentId = getComponentId[componentName]
    const Component = engine.getComponent(componentId)

    const component =
      Component.getMutableOrNull(instance.entity) ||
      Component.create(instance.entity)

    for (const key in props) {
      const keyProp = key as keyof EngineComponents[K]
      if (key === 'onChange') {
        const onChange = props[keyProp] as OnChangeState['fn']
        updateOnChange(instance.entity, componentId, { fn: onChange })
      } else {
        component[keyProp] = props[keyProp]
      }
    }
  }

  function removeChildEntity(instance: Instance) {
    changeEvents.delete(instance.entity)
    engine.removeEntity(instance.entity)
    for (const child of instance._child) {
      removeChildEntity(child)
    }
  }

  function appendChild(parent: Instance, child: Instance): void {
    if (!child || !Object.keys(parent).length) return
    const isReorder = parent._child.find((c) => c.entity === child.entity)
    // If its a reorder its seems that its a mutation of an array with key prop
    // We need to move the child to the end of the array
    // And update the order of the parent_.child array
    // child.rightOf => Latest entity of the array
    // childThatWasAtRightOfEntity = childEntity.rightOf
    if (isReorder) {
      const rightOfChild = parent._child.find((c) => c.rightOf === child.entity)
      if (rightOfChild) {
        rightOfChild.rightOf = child.rightOf
        // Re-order parent._child array
        parent._child = parent._child.filter((c) => c.entity !== child.entity)
        parent._child.push(child)
        updateTree(rightOfChild, { rightOf: rightOfChild.rightOf })
      }
      // Its a re-order. We are the last element, so we need to fetch the element before us.
      child.rightOf = parent._child[parent._child.length - 2]?.entity
    } else {
      // Its an append. Put it at the end
      child.rightOf = parent._child[parent._child.length - 1]?.entity
      parent._child.push(child)
    }
    child.parent = parent.entity
    updateTree(child, { rightOf: child.rightOf, parent: parent.entity })
  }

  function removeChild(parentInstance: Instance, child: Instance): void {
    const childIndex = parentInstance._child.findIndex(
      (c) => c.entity === child.entity
    )

    const childToModify = parentInstance._child[childIndex + 1]

    if (childToModify) {
      childToModify.rightOf = child.rightOf
      updateTree(childToModify, { rightOf: child.rightOf })
    }

    // Mutate 💀
    parentInstance._child.splice(childIndex, 1)
    removeChildEntity(child)
  }

  function updateOnChange(
    entity: Entity,
    componentId: number,
    value?: OnChangeState
  ) {
    const event =
      changeEvents.get(entity) ||
      changeEvents.set(entity, new Map()).get(entity)!
    const oldState = event.get(componentId)
    const newValue = value
      ? {
          fn: value.fn,
          timestamp: value.timestamp || oldState?.timestamp || 0
        }
      : undefined
    event.set(componentId, newValue)
  }

  const hostConfig: HostConfig<
    Type,
    Props,
    Container,
    Instance,
    TextInstance,
    SuspenseInstance,
    HydratableInstance,
    PublicInstance,
    HostContext,
    UpdatePayload,
    _ChildSet,
    TimeoutHandle,
    NoTimeout
  > = {
    ...noopConfig,

    createInstance(type: Type, props: Props): Instance {
      const entity = engine.addEntity()
      entities.add(entity)
      const instance: Instance = {
        entity,
        _child: [],
        parent: CANVAS_ROOT_ENTITY as Entity,
        rightOf: undefined
      }

      for (const key in props) {
        const keyTyped: keyof Props = key as keyof Props
        if (keyTyped === 'children' || keyTyped === 'key') {
          continue
        }
        if (isListener(keyTyped)) {
          upsertListener(instance, {
            type: 'add',
            props: props[keyTyped],
            component: keyTyped
          })
        } else {
          upsertComponent(instance, props[keyTyped], keyTyped)
        }
      }

      return instance
    },
    appendChild,
    appendChildToContainer: appendChild,
    appendInitialChild: appendChild,

    removeChild: removeChild,

    prepareUpdate(
      _instance: Instance,
      _type: Type,
      oldProps: Props,
      newProps: Props
    ): UpdatePayload {
      return componentKeys
        .map((component) =>
          propsChanged(component, oldProps[component], newProps[component])
        )
        .filter(isNotUndefined)
    },

    commitUpdate(
      instance: Instance,
      updatePayload: UpdatePayload,
      _type: Type,
      prevProps: Props,
      _nextProps: Props,
      _internalHandle: OpaqueHandle
    ): void {
      for (const update of updatePayload) {
        if (isListener(update.component)) {
          upsertListener(instance, update as Changes<keyof Listeners>)
          continue
        }
        if (update.type === 'delete') {
          removeComponent(
            instance,
            update.component,
            prevProps[update.component]
          )
        } else {
          upsertComponent(
            instance,
            update.props as Partial<EngineComponents[typeof update.component]>,
            update.component
          )
        }
      }
    },
    insertBefore(
      parentInstance: Instance,
      child: Instance,
      beforeChild: Instance
    ): void {
      const beforeChildIndex = parentInstance._child.findIndex(
        (c) => c.entity === beforeChild.entity
      )
      parentInstance._child = [
        ...parentInstance._child.slice(0, beforeChildIndex),
        child,
        ...parentInstance._child.slice(beforeChildIndex)
      ]

      child.rightOf = beforeChild.rightOf
      beforeChild.rightOf = child.entity
      child.parent = parentInstance.entity

      updateTree(child, { rightOf: child.rightOf, parent: child.parent })
      updateTree(beforeChild, { rightOf: beforeChild.rightOf })
    }
  }

  const reconciler = Reconciler(hostConfig)
  const root: Container = reconciler.createContainer(
    {},
    0,
    null,
    false,
    null,
    '',
    /* istanbul ignore next */
    function () {},
    null
  )

  // Maybe this could be something similar to Input system, but since we
  // are going to use this only here, i prefer to scope it here.
  function handleOnChange(componentId: number, resultComponentId: number) {
    return function (
      entity: unknown,
      componentResult: components.PBUiInputResult
    ) {
      const entityState = changeEvents.get(entity)?.get(componentId)
      const crdtTimestamp = engine.getLamportTimestampOrNull(
        entity,
        resultComponentId
      )
      if (
        entityState?.fn &&
        crdtTimestamp &&
        (!entityState.timestamp || crdtTimestamp > entityState.timestamp)
      ) {
        // Call onChange callback and update internal timestamp
        entityState.fn(componentResult.value)
        updateOnChange(entity, componentId, {
          fn: entityState.fn,
          timestamp: crdtTimestamp
        })
      }
    }
  }
  const uiInputOnChange = handleOnChange(UiInput._id, UiInputResult._id)

  function onChangeSystem() {
    for (const [entity, Result] of engine.getEntitiesWith(UiInputResult)) {
      uiInputOnChange(entity, Result)
    }
  }

  return {
    update: function (component: JSX.Element) {
      onChangeSystem()
      return reconciler.updateContainer(component as any, root, null)
    },
    getEntities: () => Array.from(entities)
  }
}
