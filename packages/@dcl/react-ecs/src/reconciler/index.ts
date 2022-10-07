import type { Entity, IEngine } from '@dcl/ecs'
import Reconciler, { HostConfig } from 'react-reconciler'
import { CANVAS_ROOT_ENTITY } from '../components'
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
  OpaqueHandle
} from './types'
import { isNotUndefined, noopConfig } from './utils'

function isEqual<T = unknown>(val1: T, val2: T): boolean {
  if (!val1 || !val2) {
    return val1 === val2
  }

  if (val1 === val2) {
    return true
  }

  if (typeof val1 !== typeof val2) {
    return false
  }

  if (typeof val1 !== 'object') {
    return val1 === val2
  }

  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) {
      return false
    }
  }

  if (Object.keys(val1).length !== Object.keys(val2).length) {
    return false
  }

  if (JSON.stringify(val1) === JSON.stringify(val2)) {
    return true
  }

  for (const key in val1) {
    if (!isEqual(val1[key]!, val2[key]!)) {
      return false
    }
  }

  return true
}

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
    'baseComponents' | 'getComponent' | 'addEntity' | 'removeEntity'
  >
) {
  const entities = new Set<Entity>()

  const getComponentId: { [key in keyof EntityComponents]: number } = {
    uiTransform: engine.baseComponents.UiTransform._id,
    uiText: engine.baseComponents.UiText._id,
    uiBackground: engine.baseComponents.UiBackground._id
  }

  function updateTree(
    instance: Instance,
    props: Partial<{ rightOf: Entity; parent: Entity }>
  ) {
    upsertComponent(instance, props, 'uiTransform')
  }

  function removeComponent(
    instance: Instance,
    component: keyof EntityComponents
  ) {
    const Component = engine.getComponent(getComponentId[component])
    Component.deleteFrom(instance.entity)
  }

  function upsertComponent<K extends keyof EntityComponents>(
    instance: Instance,
    props: Partial<EntityComponents[K]>,
    componentName: K
  ) {
    const componentId = getComponentId[componentName]
    const Component = engine.getComponent(componentId)

    const component =
      Component.getMutableOrNull(instance.entity) ||
      Component.create(instance.entity)

    for (const key in props) {
      const keyProp = key as keyof EntityComponents[K]
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

    console.log('append-child', { parent, child })

    child.parent = parent.entity
    child.rightOf = parent._child[parent._child.length - 1]?.entity
    parent._child.push(child)

    updateTree(child, { rightOf: child.rightOf, parent: parent.entity })
  }

  function removeChild(parentInstance: Instance, child: Instance): void {
    console.log('removeChid', { parentInstance, child })

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
      console.log('create instance', type)
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
        if (keyTyped === 'children' || keyTyped === 'key') continue
        upsertComponent(instance, props[keyTyped], keyTyped)
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
      const components = Object.keys(
        getComponentId
      ) as (keyof EntityComponents)[]
      return components
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
      console.log(updatePayload)
      for (const update of updatePayload) {
        if (update.type === 'delete') {
          removeComponent(instance, update.component)
        } else {
          upsertComponent(instance, update.props!, update.component)
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
    () => {},
    null
  )
  return {
    update: function (component: JSX.Element) {
      console.log('--------------------UPDATE------------------------')
      return reconciler.updateContainer(component as any, root, null)
    },
    getEntities: () => Array.from(entities)
  }
}
