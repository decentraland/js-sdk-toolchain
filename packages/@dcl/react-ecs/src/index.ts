/* eslint-disable @typescript-eslint/no-empty-interface */
import { ReactEcs } from './react-ecs'

export { ReactEcs }
export * from './components/div'

type DivElements = {
  divui: unknown
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends DivElements {}
  }
}

export namespace JSX {
  export interface Element {}
  export interface IntrinsicElements extends DivElements {}
  export interface Component {}
}

;(globalThis as any).ReactEcs = ReactEcs

export default ReactEcs
