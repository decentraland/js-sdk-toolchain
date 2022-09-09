import type { IEntity, IEngine } from '@dcl/ecs'
import Reconciler, { HostConfig } from 'react-reconciler'
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
    if (prevProps[propKey] !== nextProps[propKey]) {
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
  const entities = new Set<IEntity>()

  function updateTree(
    instance: Instance,
    props: Partial<{ rightOf: IEntity; parent: IEntity }>
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
    component: K
  ) {
    const componentId = getComponentId[component]
    const Component = engine.getComponent(componentId)
    const transform =
      Component.getMutableOrNull(instance.entity) ||
      Component.create(instance.entity)

    for (const key in props) {
      const keyProp = key as keyof EntityComponents[K]
      transform[keyProp] = props[keyProp]
    }
  }

  function removeChildEntity(instance: Instance) {
    engine.removeEntity(instance.entity)
    for (const child of instance._child) {
      removeChildEntity(child)
    }
  }
  const getComponentId: { [key in keyof EntityComponents]: number } = {
    uiTransform: engine.baseComponents.UiTransform._id
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
      const instance: Instance = { entity, _child: [] }

      for (const key in props) {
        if (key === 'children') continue
        const component: keyof EntityComponents = key as keyof EntityComponents
        upsertComponent(instance, props[component], component)
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
