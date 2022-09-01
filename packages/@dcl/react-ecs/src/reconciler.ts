import Reconciler, { HostConfig } from 'react-reconciler'
import { JSX } from '.'
// import { IEngine } from '../types'
type IEngine = any
type Entity = number
import { DivProps } from './components/div'
import { defaultDiv } from './components/div/utils'

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

export function createReconciler(
  engine: Pick<IEngine, 'baseComponents' | 'getComponent' | 'addEntity'>
) {
  const { UiTransform } = engine.baseComponents
  const entities = new Set<Entity>()

  function updateComponentTree(instance: Instance) {
    console.log(instance)
    const comp = engine
      .getComponent(instance.componentId)
      .getMutable(instance.entity)
    comp.rightOf = instance.rightOf
    comp.parent = instance.parent
  }

  function updateComponentProps(instance: Instance, props: Partial<DivProps>) {
    const comp = engine
      .getComponent(instance.componentId)
      .getMutable(instance.entity)

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
      entities.add(entity)
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

    detachDeletedInstance: function (_node: Instance): void {
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
      return reconciler.updateContainer(component as any, root, null)
    },
    getEntities: () => Array.from(entities)
  }
}

export const noopConfig = {
  hideInstance(_instance: Instance): void {},
  hideTextInstance(_textInstance: TextInstance): void {},
  unhideInstance(_instance: Instance, _props: Props): void {},
  unhideTextInstance(_textInstance: TextInstance, _text: string): void {},
  clearContainer(_container: Container): void {},
  getCurrentEventPriority: function (): number {
    return 0
  },
  getInstanceFromNode: function (_node: Instance): null | undefined {
    return null
  },
  beforeActiveInstanceBlur: function (): void {},
  afterActiveInstanceBlur: function (): void {},
  prepareScopeUpdate: function (
    _scopeInstance: any,
    _instance: Instance
  ): void {},
  getInstanceFromScope: function (_scopeInstance: Instance): Instance | null {
    return null
  },
  commitMount(
    _instance: Instance,
    _type: Type,
    _props: Props,
    _internalInstanceHandle: OpaqueHandle
  ): void {},
  resetTextContent(_instance: Instance): void {},
  commitTextUpdate(
    _textInstance: TextInstance,
    _oldText: string,
    _newText: string
  ): void {},
  prepareForCommit(_containerInfo: Container): Record<string, any> | null {
    return null
  },
  resetAfterCommit(_containerInfo: Container): void {},
  preparePortalMount(_containerInfo: Container): void {},
  createTextInstance(
    _text: string,
    _rootContainer: Container,
    _hostContext: HostContext,
    _internalHandle: OpaqueHandle
  ): TextInstance {
    return {} as TextInstance
  },
  scheduleTimeout(_fn: any, _delay?: number): TimeoutHandle {},
  cancelTimeout(_id: TimeoutHandle): void {},
  shouldSetTextContent(_type: Type, _props: Props): boolean {
    return false
  },
  getRootHostContext(_rootContainer: Container): HostContext | null {
    return null
  },
  getChildHostContext(
    _parentHostContext: HostContext,
    _type: Type,
    _rootContainer: Container
  ): HostContext {
    return null
  },
  getPublicInstance(instance: Instance | TextInstance): PublicInstance {
    return instance
  },
  finalizeInitialChildren(
    _instance: Instance,
    _type: Type,
    _props: Props,
    _rootContainer: Container,
    _hostContext: HostContext
  ): boolean {
    return false
  }
}

type OpaqueHandle = any
type Type = string
type Props = Partial<DivProps>
type Container = Document | Instance | any
type Instance = {
  entity: number
  componentId: number
  parent?: number
  rightOf?: number
  _child: Instance[]
}
type TextInstance = unknown
type SuspenseInstance = any
type HydratableInstance = any
type PublicInstance = any
type HostContext = any
type UpdatePayload = any
type _ChildSet = any
type TimeoutHandle = any
type NoTimeout = number

export default createReconciler
