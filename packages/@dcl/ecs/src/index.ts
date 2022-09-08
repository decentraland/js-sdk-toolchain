/* eslint-disable @typescript-eslint/no-empty-interface */
// The order of the following imports matters. Please do not auto-sort

export * from './runtime/Math'
export * from './engine'
export * from './schemas'
export * from './runtime/initialization'

export { cyclicParentingChecker } from './systems/cyclicParentingChecker'

export * from './components/generated/global.gen'
export * from './components/generated/global.namespace.gen'

export * from './runtime/types'

export * from './engine/events'
export * from './runtime/observables'
export * from './runtime/temp-fp/Observable'

export type EcsElements = {
  entity: unknown
}

export namespace JSX {
  export type Element = any
  export interface IntrinsicElements extends EcsElements {}
  export interface Component {}
}
