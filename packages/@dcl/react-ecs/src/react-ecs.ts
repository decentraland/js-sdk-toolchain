/* eslint-disable @typescript-eslint/no-empty-interface */
import { PBUiBackground, PBUiText, PBUiTransform, PBUiInput, PBUiDropdown } from '@dcl/ecs'
import React from 'react'
import { Callback, Children, Key } from './components'

/**
 * @public
 */
export interface EcsElements {
  entity: Partial<EntityComponents> & { children?: Children; key?: Key }
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
}

/**
 * @hidden
 */
export namespace JSX {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export type Element = {} | null
  export type IntrinsicElements = EcsElements
  export interface Component {}
}

/**
 * @public
 */
export namespace ReactEcs {
  export namespace JSX {
    /**
     * @public
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    export type Element = {} | null
    /**
     * @public
     * HTML tag elements
     */
    export type IntrinsicElements = EcsElements
    /**
     * @public
     * Component empty interface
     */
    export interface Component {}
  }
  export const createElement = (React as any).createElement
}
