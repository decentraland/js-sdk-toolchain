/* eslint-disable @typescript-eslint/no-empty-interface */
import { PBUiBackground, PBUiText, PBUiTransform, PBUiInput, PBUiDropdown, EventSystemCallback } from '@dcl/ecs'
import React from 'react'
import { Key, MultiCallback } from './components'

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
  onMouseDown: EventSystemCallback
  onMouseUp: EventSystemCallback
  onMouseEnter: EventSystemCallback
  onMouseLeave: EventSystemCallback
  onMouseDrag: EventSystemCallback
  onMouseDragLocked: EventSystemCallback
  onMouseDragEnd: EventSystemCallback
  onInputDown: MultiCallback
  onInputUp: MultiCallback
  onInputDrag: MultiCallback
  onInputDragLocked: MultiCallback
  onInputDragEnd: MultiCallback
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

  /**
   * @public
   * Provider component returned by `createContext`. Wrap a subtree with it
   * to make `value` available to any descendant that calls `useContext`.
   */
  export interface Provider<T> {
    (props: { value: T; children?: JSX.ReactNode }): JSX.Element | null
  }

  /**
   * @public
   * Consumer component returned by `createContext`. Renders its child
   * function with the current context value.
   */
  export interface Consumer<T> {
    (props: { children: (value: T) => JSX.ReactNode }): JSX.Element | null
  }

  /**
   * @public
   * Object returned by `createContext`. Pass to `useContext` to read the
   * current value, or use `<MyContext.Provider value={...}>` to set one.
   */
  export interface Context<T> {
    Provider: Provider<T>
    Consumer: Consumer<T>
    displayName?: string
  }

  type CreateContext = <T>(defaultValue: T) => Context<T>
  type ContextHook = <T>(context: Context<T>) => T

  /**
   * @public
   * Creates a Context object. The default value is used by descendants that
   * don't have a matching Provider above them in the tree.
   */
  export const createContext: CreateContext = (React as any).createContext

  /**
   * @public
   * Reads the value of the nearest matching Provider for the given Context.
   * If none is found, returns the Context's default value.
   */
  export const useContext: ContextHook = (React as any).useContext
}
