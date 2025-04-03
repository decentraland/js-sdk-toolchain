/* eslint-disable @typescript-eslint/no-empty-interface */
import { PBUiBackground, PBUiText, PBUiTransform, PBUiInput, PBUiDropdown } from '@dcl/ecs'
import React from 'react'
import { Callback, Key } from './components'

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
  onMouseDown: Callback
  onMouseUp: Callback
  onMouseEnter: Callback
  onMouseLeave: Callback
  onMouseDrag: Callback
  onMouseDragLocked: Callback
  onMouseDragEnd: Callback
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
  type SetStateAction<T> = T | ((prevState: T) => T)
  type Dispatch<T> = (action: SetStateAction<T>) => void
  type StateHook = <T>(initialState: T | (() => T)) => [T, Dispatch<T>]

  // Type for useEffect
  type DependencyList = ReadonlyArray<any>
  type EffectCallback = () => void | (() => void | undefined)
  type EffectHook = (effect: EffectCallback, deps?: DependencyList) => void
  export const useEffect: EffectHook = (React as any).useEffect
  export const useState: StateHook = (React as any).useState
}
