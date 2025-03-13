/* eslint-disable @typescript-eslint/no-empty-interface */
import { PBUiBackground, PBUiText, PBUiTransform, PBUiInput, PBUiDropdown } from '@dcl/ecs'
import React from 'react'
import { Callback, Key, MultiCallback } from './components'

/**
 * @public
 */
export interface EcsElements {
  entity: Partial<EntityComponents> & { children?: ReactEcs.JSX.ReactNode; key?: Key }
}

/**
 * @public
 */
export type EntityComponents = {
  uiTransform: PBUiTransform
  uiText: PBUiText
  uiBackground: PBUiBackground
  uiInput: PBUiInput
  uiDropdown: PBUiDropdown
  onMouseDown: MultiCallback
  onMouseUp: MultiCallback
  onMouseEnter: Callback
  onMouseLeave: Callback
  onMouseDrag: MultiCallback
  onMouseDragLocked: MultiCallback
  onMouseDragEnd: MultiCallback
}

/**
 * @hidden
 */
export namespace JSX {
  export interface Element extends ReactElement<any, any> {}
  export interface IntrinsicElements extends EcsElements {}
  export interface Component {}
}
/**
 * @public
 */
export type JSXElementConstructor<P> = (props: P) => ReactElement<any, any> | null

/**
 * @public
 */
export interface ReactElement<
  P = any,
  T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>
> {
  type: T
  props: P
  key: Key | null
}
/**
 * @public
 */
export namespace ReactEcs {
  export namespace JSX {
    /**
     * @public
     */
    export type ReactNode = Element | ReactElement | string | number | boolean | null | undefined | ReactNode[]
    /**
     * @public
     */
    export interface Element extends ReactElement<any, any> {}
    /**
     * @public
     * HTML tag elements
     */
    export interface IntrinsicElements extends EcsElements {}
    /**
     * @public
     * Component empty interface
     */
    export interface Component {}
  }
  export const createElement = (React as any).createElement
}
