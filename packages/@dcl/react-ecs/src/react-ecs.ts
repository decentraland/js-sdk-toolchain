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

  // useMemo
  type MemoHook = <T>(factory: () => T, deps: DependencyList | undefined) => T
  export const useMemo: MemoHook = (React as any).useMemo

  // useCallback
  type CallbackHook = <T extends (...args: any[]) => any>(callback: T, deps: DependencyList) => T
  export const useCallback: CallbackHook = (React as any).useCallback

  // useRef
  export interface MutableRefObject<T> {
    current: T
  }
  type RefHook = <T>(initialValue: T) => MutableRefObject<T>
  export const useRef: RefHook = (React as any).useRef

  // useReducer
  type Reducer<S, A> = (prevState: S, action: A) => S
  type ReducerHook = <S, A>(reducer: Reducer<S, A>, initialState: S) => [S, (action: A) => void]
  export const useReducer: ReducerHook = (React as any).useReducer

  // React.memo
  type MemoComponent = <P extends object>(
    Component: (props: P) => ReactEcs.JSX.ReactNode,
    propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
  ) => (props: P) => ReactElement | null
  export const memo: MemoComponent = (React as any).memo

  // Fragment
  export const Fragment: (props: { children?: ReactEcs.JSX.ReactNode }) => ReactEcs.JSX.ReactNode =
    (React as any).Fragment
}
