// The order of the following imports matters. Please do not auto-sort

export * from './runtime/Math'
export * from './engine'
export * from './schemas'
export * from './runtime/initialization'

export { cyclicParentingChecker } from './systems/cyclicParentingChecker'

export * from './components/generated/global.gen'
export * from './components/generated/global.namespace.gen'

export * from './runtime/types'
export * from './runtime/observables'
export * from './runtime/temp-fp/Observable'

declare global {
  namespace JSX {
    type Element = any
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IntrinsicElements {}
  }
}
