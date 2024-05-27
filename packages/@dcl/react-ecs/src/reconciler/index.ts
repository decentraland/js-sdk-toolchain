import { Entity, IEngine, InputAction, PointerEventsSystem, PointerEventType } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import Reconciler, { HostConfig } from 'react-reconciler'
import { Callback, isListener, Listeners } from '../components'
import { CANVAS_ROOT_ENTITY } from '../components/uiTransform'
import { ReactEcs } from '../react-ecs'
import {
  Changes,
  Container,
  EngineComponents,
  HostContext,
  HydratableInstance,
  Instance,
  NoTimeout,
  OpaqueHandle,
  Props,
  PublicInstance,
  SuspenseInstance,
  TextInstance,
  TimeoutHandle,
  Type,
  UpdatePayload,
  _ChildSet
} from './types'
import { componentKeys, isNotUndefined, noopConfig, propsChanged } from './utils'

function getPointerEnum(pointerKey: keyof Listeners): PointerEventType {
  const pointers: { [key in keyof Required<Listeners>]: PointerEventType } = {
    onMouseDown: PointerEventType.PET_DOWN,
    onMouseUp: PointerEventType.PET_UP
  }
  return pointers[pointerKey]
}

type OnChangeState<T = string | number> = {
  onChangeCallback?: (val?: T) => void
  onSubmitCallback?: (val?: T) => void
  value?: T
  isSubmit?: boolean
}
export function createReconciler(
  engine: Pick<
    IEngine,
    'getComponent' | 'addEntity' | 'removeEntity' | 'defineComponentFromSchema' | 'getEntitiesWith'
  >,
  pointerEvents: PointerEventsSystem
) {
  // Store all the entities so when we destroy the UI we can also destroy them
  const entities = new Set<Entity>()
  // Store the onChange callbacks to be runned every time a Result has changed
  const changeEvents = new Map<Entity, Map<number, OnChangeState | undefined>>()
  const clickEvents = new Map<Entity, Map<PointerEventType, Callback>>()
  // Initialize components
  const UiTransform = components.UiTransform(engine)
  const UiText = components.UiText(engine)
  const UiBackground = components.UiBackground(engine)
  const UiInput = components.UiInput(engine)
  const UiInputResult = components.UiInputResult(engine)
  const UiDropdown = components.UiDropdown(engine)
  const UiDropdownResult = components.UiDropdownResult(engine)

  // Component ID Helper
  const getComponentId: {
    [key in keyof EngineComponents]: number
  } = {
    uiTransform: UiTransform.componentId,
    uiText: UiText.componentId,
    uiBackground: UiBackground.componentId,
    uiInput: UiInput.componentId,
    uiDropdown: UiDropdown.componentId
  }

  function pointerEventCallback(entity: Entity, pointerEvent: PointerEventType) {
    const callback = clickEvents.get(entity)?.get(pointerEvent)
    if (callback) callback()
    return
  }

  function updateTree(instance: Instance, props: Partial<{ rightOf: Entity; parent: Entity }>) {
    upsertComponent(instance, props as { rightOf: number; parent: number }, 'uiTransform')
  }

  function upsertListener(instance: Instance, update: Changes<keyof Pick<Listeners, 'onMouseDown' | 'onMouseUp'>>) {
    if (update.type === 'delete' || !update.props) {
      clickEvents.get(instance.entity)?.delete(getPointerEnum(update.component))
      if (update.component === 'onMouseDown') {
        pointerEvents.removeOnPointerDown(instance.entity)
      } else if (update.component === 'onMouseUp') {
        pointerEvents.removeOnPointerUp(instance.entity)
      }
      return
    }

    if (update.props) {
      const pointerEvent = getPointerEnum(update.component)
      const entityEvent =
        clickEvents.get(instance.entity) || clickEvents.set(instance.entity, new Map()).get(instance.entity)!
      const alreadyHasPointerEvent = entityEvent.get(pointerEvent)
      entityEvent.set(pointerEvent, update.props as Callback)

      if (alreadyHasPointerEvent) return

      const pointerEventSystem =
        update.component === 'onMouseDown' ? pointerEvents.onPointerDown : pointerEvents.onPointerUp
      pointerEventSystem(instance.entity, () => pointerEventCallback(instance.entity, pointerEvent), {
        button: InputAction.IA_POINTER,
        // We add this showFeedBack so the pointerEventSystem creates a PointerEvent component with our entity
        // This is needed for the renderer to know which entities are clickeables
        showFeedback: true
      })
    }
  }

  function removeComponent(instance: Instance, component: keyof EngineComponents) {
    const componentId = getComponentId[component]
    const Component = engine.getComponent(componentId) as components.LastWriteWinElementSetComponentDefinition<any>
    Component.deleteFrom(instance.entity)
  }

  function upsertComponent<K extends keyof EngineComponents>(
    instance: Instance,
    props: Partial<EngineComponents[K]> = {},
    componentName: K
  ) {
    const componentId = getComponentId[componentName]

    const onChangeExists = 'onChange' in props
    const onSubmitExists = 'onSubmit' in props
    const entityState = changeEvents.get(instance.entity)?.get(componentId)
    const onChange = onChangeExists
      ? (props['onChange'] as OnChangeState['onChangeCallback'])
      : entityState?.onChangeCallback
    const onSubmit = onSubmitExists
      ? (props['onSubmit'] as OnChangeState['onSubmitCallback'])
      : entityState?.onSubmitCallback

    if (onChangeExists || onSubmitExists) {
      updateOnChange(instance.entity, componentId, {
        onChangeCallback: onChange,
        onSubmitCallback: onSubmit
      })
      delete (props as any).onChange
      delete (props as any).onSubmit
    }

    // We check if there is any key pending to be changed to avoid updating the existing component
    if (!Object.keys(props).length) {
      return
    }
    const ComponentDef = engine.getComponent(componentId) as components.LastWriteWinElementSetComponentDefinition<
      EngineComponents[K]
    >
    const component = ComponentDef.getMutableOrNull(instance.entity) || ComponentDef.create(instance.entity)
    for (const key in props) {
      const keyProp = key as keyof EngineComponents[K]
      component[keyProp] = props[keyProp]!
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
    const childIndex = parentInstance._child.findIndex((c) => c.entity === child.entity)

    const childToModify = parentInstance._child[childIndex + 1]

    if (childToModify) {
      childToModify.rightOf = child.rightOf
      updateTree(childToModify, { rightOf: child.rightOf })
    }

    // Mutate 💀
    parentInstance._child.splice(childIndex, 1)
    removeChildEntity(child)
  }

  function updateOnChange(entity: Entity, componentId: number, state?: OnChangeState) {
    const event = changeEvents.get(entity) || changeEvents.set(entity, new Map()).get(entity)!
    const oldState = event.get(componentId)
    const onChangeCallback = state?.onChangeCallback
    const onSubmitCallback = state?.onSubmitCallback
    const value = state?.value ?? oldState?.value
    const isSubmit = state?.isSubmit ?? oldState?.isSubmit
    event.set(componentId, { onChangeCallback, onSubmitCallback, value, isSubmit })
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

    prepareUpdate(_instance: Instance, _type: Type, oldProps: Props, newProps: Props): UpdatePayload {
      return componentKeys
        .map((component) => propsChanged(component, oldProps[component], newProps[component]))
        .filter(isNotUndefined)
    },

    commitUpdate(
      instance: Instance,
      updatePayload: UpdatePayload,
      _type: Type,
      _prevProps: Props,
      _nextProps: Props,
      _internalHandle: OpaqueHandle
    ): void {
      for (const update of updatePayload) {
        if (isListener(update.component)) {
          upsertListener(instance, update as Changes<keyof Listeners>)
          continue
        }
        if (update.type === 'delete') {
          removeComponent(instance, update.component)
        } else if (update.props) {
          upsertComponent(instance, update.props, update.component)
        }
      }
    },
    insertBefore(parentInstance: Instance, child: Instance, beforeChild: Instance): void {
      const beforeChildIndex = parentInstance._child.findIndex((c) => c.entity === beforeChild.entity)
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
    },
    removeChildFromContainer(parenInstance: Instance, child: Instance) {
      removeChildEntity(child)
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
  function handleOnChange(componentId: number, resultComponent: typeof UiDropdownResult | typeof UiInputResult) {
    for (const [entity, Result] of engine.getEntitiesWith(resultComponent)) {
      const entityState = changeEvents.get(entity)?.get(componentId)
      const isSubmit = !!(Result as any).isSubmit
      if (entityState?.onChangeCallback && Result.value !== entityState.value) {
        entityState.onChangeCallback(Result.value)
      }
      if (entityState?.onSubmitCallback && isSubmit && !entityState.isSubmit) {
        entityState.onSubmitCallback(Result.value)
      }

      updateOnChange(entity, componentId, {
        onChangeCallback: entityState?.onChangeCallback,
        onSubmitCallback: entityState?.onSubmitCallback,
        value: Result.value,
        isSubmit
      })
    }
  }

  return {
    update: function (component: ReactEcs.JSX.Element) {
      if (changeEvents.size) {
        handleOnChange(UiInput.componentId, UiInputResult)
        handleOnChange(UiDropdown.componentId, UiDropdownResult)
      }
      return reconciler.updateContainer(component as any, root, null)
    },
    getEntities: () => Array.from(entities)
  }
}
