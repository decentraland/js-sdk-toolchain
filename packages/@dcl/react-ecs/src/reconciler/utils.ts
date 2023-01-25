import { isListener } from '../components'
import { EntityComponents } from '../react-ecs'
import {
  Changes,
  Container,
  HostContext,
  Instance,
  OpaqueHandle,
  Props,
  PublicInstance,
  SuspenseInstance,
  TextInstance,
  TimeoutHandle,
  Type
} from './types'

export function propsChanged<K extends keyof EntityComponents>(
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
// as any HACK so every time we add a new component, we must add also the component here.
const entityComponent: EntityComponents = {
  uiText: undefined as any,
  uiBackground: undefined as any,
  uiTransform: undefined as any,
  onMouseDown: undefined as any,
  onMouseUp: undefined as any,
  uiInput: undefined as any,
  uiDropdown: undefined as any
}
export const componentKeys: (keyof EntityComponents)[] = Object.keys(entityComponent) as (keyof EntityComponents)[]

export function isEqual<T = unknown>(val1: T, val2: T): boolean {
  if (!val1 && !val2) {
    return true
  }

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

  /* istanbul ignore next */
  return true
}

export const isNotUndefined = <T>(val: T | undefined): val is T => {
  return !!val
}

export const noopConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  noTimeout: -1,
  isPrimaryRenderer: true,
  supportsHydration: false,

  /* istanbul ignore next */
  insertInContainerBefore(
    _container: Container,
    _child: Instance | TextInstance,
    _beforeChild: Instance | TextInstance | SuspenseInstance
  ): void {},
  detachDeletedInstance(_node: Instance) {},
  /* istanbul ignore next */
  hideInstance(_instance: Instance): void {},
  /* istanbul ignore next */
  hideTextInstance(_textInstance: TextInstance): void {},
  /* istanbul ignore next */
  unhideInstance(_instance: Instance, _props: Props): void {},
  /* istanbul ignore next */
  unhideTextInstance(_textInstance: TextInstance, _text: string): void {},
  /* istanbul ignore next */
  clearContainer(_container: Container): void {},
  /* istanbul ignore next */
  getCurrentEventPriority(): number {
    /* istanbul ignore next */
    return 0
  },
  /* istanbul ignore next */
  getInstanceFromNode(_node: Instance): null | undefined {
    /* istanbul ignore next */
    return null
  },
  /* istanbul ignore next */
  beforeActiveInstanceBlur(): void {},
  /* istanbul ignore next */
  afterActiveInstanceBlur(): void {},
  /* istanbul ignore next */
  prepareScopeUpdate() {},
  /* istanbul ignore next */
  getInstanceFromScope() {
    /* istanbul ignore next */
    return null
  },
  /* istanbul ignore next */
  commitMount(_instance: Instance, _type: Type, _props: Props, _internalInstanceHandle: OpaqueHandle): void {},
  /* istanbul ignore next */
  resetTextContent(_instance: Instance): void {},
  /* istanbul ignore next */
  commitTextUpdate(_textInstance: TextInstance, _oldText: string, _newText: string): void {},
  prepareForCommit(_containerInfo: Container): Record<string, any> | null {
    return null
  },
  resetAfterCommit(_containerInfo: Container): void {},
  /* istanbul ignore next */
  preparePortalMount(_containerInfo: Container): void {},
  /* istanbul ignore next */
  createTextInstance(
    _text: string,
    _rootContainer: Container,
    _hostContext: HostContext,
    _internalHandle: OpaqueHandle
  ): TextInstance {
    /* istanbul ignore next */
    return {} as TextInstance
  },
  /* istanbul ignore next */
  scheduleTimeout(_fn: any, _delay?: number): TimeoutHandle {},
  /* istanbul ignore next */
  cancelTimeout(_id: TimeoutHandle): void {},
  shouldSetTextContent(_type: Type, _props: Props): boolean {
    return false
  },
  getRootHostContext(_rootContainer: Container): HostContext | null {
    return null
  },
  getChildHostContext(_parentHostContext: HostContext, _type: Type, _rootContainer: Container): HostContext {
    /* istanbul ignore next */
    return null
  },
  /* istanbul ignore next */
  getPublicInstance(instance: Instance): PublicInstance {
    /* istanbul ignore next */
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
