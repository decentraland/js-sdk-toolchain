import {
  Instance,
  TextInstance,
  Props,
  Container,
  PublicInstance,
  HostContext,
  _ChildSet,
  TimeoutHandle,
  Type,
  OpaqueHandle
} from './types'

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
