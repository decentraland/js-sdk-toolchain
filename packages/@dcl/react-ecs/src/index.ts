/* eslint-disable @typescript-eslint/no-empty-interface */
import { PBUiTransform } from './generated/UiTransform.gen'
import { ReactEcs } from './react-ecs'

export { ReactEcs }
export * from './components'

export type EcsElements = {
  entity: Partial<EntityComponents>
}

export type EntityComponents = {
  uiTransform: PBUiTransform
}

declare global {
  namespace JSX {
    type Element = any
    interface IntrinsicElements extends EcsElements {}
  }
}

export namespace JSX {
  export interface Element {}
  export interface IntrinsicElements extends EcsElements {}
  export interface Component {}
}

;(globalThis as any).ReactEcs = ReactEcs

export default ReactEcs
