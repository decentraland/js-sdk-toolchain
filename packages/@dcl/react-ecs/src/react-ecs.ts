/* eslint-disable @typescript-eslint/no-empty-interface */
import {
  PBUiBackground,
  PBUiText,
  PBUiTransform,
  PBUiInput,
  PBUiDropdown
} from '@dcl/ecs'
import React from 'react'
import { Callback } from './components'
import { CommonProps } from './components/types'

export type EcsElements = {
  entity: Partial<EntityComponents & CommonProps>
}

export type EntityComponents = {
  uiTransform: PBUiTransform
  uiText: PBUiText
  uiBackground: PBUiBackground
  uiInput: PBUiInput
  uiDropdown: PBUiDropdown
  onMouseDown: Callback
  onMouseUp: Callback
}

export namespace JSX {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export type Element = {} | null
  export type IntrinsicElements = EcsElements
  export interface Component {}
}

export namespace ReactEcs {
  export namespace JSX {
    // eslint-disable-next-line @typescript-eslint/ban-types
    export type Element = {} | null
    export type IntrinsicElements = EcsElements
    export interface Component {}
  }
  // TODO: check if this as any is still needed
  export const createElement = (React as any).createElement
}
