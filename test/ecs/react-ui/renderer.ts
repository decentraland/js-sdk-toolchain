import Reconciler, { HostConfig } from 'react-reconciler'
import { IEngine } from '../../src/engine'
import { DivProps } from '../../src/engine/jsx'
import { defaultDiv } from '../../src/engine/jsx/utils'
import {
  Instance,
  OpaqueHandle,
  Type,
  Props,
  Container,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  PublicInstance,
  HostContext,
  UpdatePayload,
  _ChildSet,
  TimeoutHandle,
  NoTimeout
} from './types'
import { noopConfig } from './utils'

function propsChanged(
  prevProps: Partial<DivProps>,
  nextProps: Partial<DivProps>
) {
  if (Object.keys(prevProps).length !== Object.keys(nextProps).length) {
    return true
  }

  for (const key in prevProps) {
    if (key === 'children') continue
    const propKey = key as keyof DivProps
    if (prevProps[propKey] !== nextProps[propKey]) {
      return true
    }
  }
  return false
}

export function createRenderer(engine: IEngine) {
  const { UiTransform } = engine.baseComponents

  function updateComponentTree(instance: Instance) {
    console.log(instance)
    const comp = engine
      .getComponent(instance.componentId)
      .mutable(instance.entity)
    comp.rightOf = instance.rightOf
    comp.parent = instance.parent
  }

  function updateComponentProps(instance: Instance, props: Partial<DivProps>) {
    const comp = engine
      .getComponent(instance.componentId)
      .mutable(instance.entity)

    for (const propKey in props) {
      const key = propKey as keyof DivProps
      comp[key] = props[key]
    }
  }

  function removeComponent(instance: Instance) {
    // TODO: we should remove the component or remove the entity ?
    engine.getComponent(instance.componentId).deleteFrom(instance.entity)
    for (const child of instance._child) {
      removeComponent(child)
    }
  }

  function appendChild(parent: Instance, child: Instance): void {
    if (!child || !Object.keys(parent).length) return

    console.log('append-child', { parent, child })

    child.parent = parent.entity
    child.rightOf = parent._child[parent._child.length - 1]?.entity
    parent._child.push(child)

    updateComponentTree(child)
  }

  function removeChild(parentInstance: Instance, child: Instance): void {
    console.log('removeChid', { parentInstance, child })

    const childIndex = parentInstance._child.findIndex(
      (c) => c.entity === child.entity
    )

    const childToModify = parentInstance._child[childIndex + 1]

    if (childToModify) {
      childToModify.rightOf = child.rightOf
      updateComponentTree(childToModify)
    }

    // Mutate 💀
    parentInstance._child.splice(childIndex, 1)
    removeComponent(child)
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
    supportsMutation: true,
    supportsPersistence: false,
    noTimeout: -1,
    isPrimaryRenderer: true,
    supportsHydration: false,

    createInstance(type: Type, props: Props): Instance {
      console.log('in createInstance', { type, props })
      const entity = engine.addEntity()
      const { children, ...divProps } = props
      UiTransform.create(entity, {
        ...defaultDiv,
        ...divProps,
        parent: 0
      })

      return { entity, componentId: UiTransform._id, _child: [] }
    },
    appendChild,
    appendChildToContainer: appendChild,
    appendInitialChild: appendChild,

    removeChild: removeChild,
    removeChildFromContainer: () => {
      // TODO: wtf
      console.log('removechildereta')
      // removeChild(args)
    },

    prepareUpdate(
      _instance: Instance,
      _type: Type,
      oldProps: Props,
      newProps: Props
    ): UpdatePayload | null {
      return propsChanged(oldProps, newProps)
    },

    commitUpdate(
      instance: Instance,
      updatePayload: UpdatePayload,
      type: Type,
      prevProps: Props,
      nextProps: Props,
      _internalHandle: OpaqueHandle
    ): void {
      console.log('commitupdate', {
        instance,
        updatePayload,
        type,
        prevProps,
        nextProps
      })
      if (!updatePayload) return
      updateComponentProps(instance, nextProps)
    },
    insertBefore(
      parentInstance: Instance,
      child: Instance,
      beforeChild: Instance
    ): void {
      console.log('insertbefore', { parentInstance, child, beforeChild })

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

      updateComponentTree(child)
      updateComponentTree(beforeChild)
    },
    insertInContainerBefore(
      _container: Container,
      _child: Instance | TextInstance,
      _beforeChild: Instance | TextInstance | SuspenseInstance
    ): void {
      console.log('insertIncontainerBefore TODO')
    },

    detachDeletedInstance: function (node: Instance): void {
      // console.log('detahDeletedInstance')
      // console.log({ node })
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
      return reconciler.updateContainer(component, root, null)
    }
  }
}

export default createRenderer
