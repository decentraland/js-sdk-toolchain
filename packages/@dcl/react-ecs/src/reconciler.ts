import Reconciler, { HostConfig } from 'react-reconciler'
import { EntityComponents, JSX } from '.'

// TODO: Fix this types
type IEntity = number
type IEngine = any

const isNotUndefined = <T>(val: T | undefined): val is T => {
  return !!val
}

type Changes<K extends keyof EntityComponents = keyof EntityComponents> = {
  type: 'delete' | 'add' | 'put'
  props?: Partial<EntityComponents[K]>
  component: K
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
    supportsMutation: true,
    supportsPersistence: false,
    noTimeout: -1,
    isPrimaryRenderer: true,
    supportsHydration: false,

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
    removeChildFromContainer: () => {
      // TODO: wtf
      // removeChild(args)
    },

    prepareUpdate(
      _instance: Instance,
      _type: Type,
      oldProps: Props,
      newProps: Props
    ): UpdatePayload {
      const components: (keyof EntityComponents)[] = ['uiTransform']
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
    },
    insertInContainerBefore(
      _container: Container,
      _child: Instance | TextInstance,
      _beforeChild: Instance | TextInstance | SuspenseInstance
    ): void {
      // console.log('insertIncontainerBefore TODO')
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
type Type = 'divui' | 'textui' | 'imageui' | 'entity'
type Props = EntityComponents
type Container = Document | Instance | any
type Instance = {
  entity: IEntity
  parent?: IEntity
  rightOf?: IEntity
  _child: Instance[]
}
type TextInstance = unknown
type SuspenseInstance = any
type HydratableInstance = any
type PublicInstance = any
type HostContext = any
type UpdatePayload = Changes[]
type _ChildSet = any
type TimeoutHandle = any
type NoTimeout = number

export default createReconciler
