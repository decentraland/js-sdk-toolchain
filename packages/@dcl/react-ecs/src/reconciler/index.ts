import {
  Entity,
  IEngine,
  components,
  EventSystemCallback,
  PointerEventsSystem
} from '@dcl/ecs'
import Reconciler, { HostConfig } from 'react-reconciler'
import { isListener, Listeners } from '../components'
import { CANVAS_ROOT_ENTITY } from '../components/uiTransform'
import { EntityComponents, JSX } from '../react-ecs'
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
import { componentKeys, isEqual, isNotUndefined, noopConfig } from './utils'

// TODO: export InputAction types.
const IA_POINTER = 0
function propsChanged<K extends keyof EntityComponents>(
  component: K,
  prevProps: Partial<EntityComponents[K]>,
  nextProps: Partial<EntityComponents[K]>
): Changes<K> | undefined {
  if (prevProps && !nextProps) {
    return { type: 'delete', component }
  }

  if (!nextProps) {
    return
  }

  if (!prevProps && nextProps) {
    return { type: 'add', props: nextProps, component }
  }

  if (isListener(component)) {
    if (!isEqual(prevProps, nextProps)) {
      return { type: 'put', component, props: nextProps }
    }
  }

  const changes: Partial<EntityComponents[K]> = {}
  // TODO: array and object types. For now only primitives
  for (const k in prevProps) {
    const propKey = k as keyof typeof prevProps
    if (!isEqual(prevProps[propKey], nextProps[propKey])) {
      changes[propKey] = nextProps[propKey]
    }
  }

  if (!Object.keys(changes).length) {
    return
  }

  return { type: 'put', props: changes, component }
}

export function createReconciler(
  engine: Pick<
    IEngine,
    'getComponent' | 'addEntity' | 'removeEntity' | 'defineComponentFromSchema'
  >,
  pointerEvents: PointerEventsSystem
) {
  const entities = new Set<Entity>()

  const UiTransform = components.UiTransform(engine)
  const UiText = components.UiText(engine)
  const UiBackground = components.UiBackground(engine)

  const getComponentId: {
    [key in keyof EngineComponents]: number
  } = {
    uiTransform: UiTransform._id,
    uiText: UiText._id,
    uiBackground: UiBackground._id
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
          button: IA_POINTER,
          hoverText: ''
        }
      )
    }
  }

  function removeComponent(
    instance: Instance,
    component: keyof EngineComponents
  ) {
    const Component = engine.getComponent(getComponentId[component])
    Component.deleteFrom(instance.entity)
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
      component[keyProp] = props[keyProp]
    }
  }

  function removeChildEntity(instance: Instance) {
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
      _prevPropsProps: Props,
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
  return {
    update: function (component: JSX.Element) {
      return reconciler.updateContainer(component as any, root, null)
    },
    getEntities: () => Array.from(entities)
  }
}
