/* eslint-disable @typescript-eslint/no-empty-interface */
import React from 'react'
import {
  UiTextProps,
  PBUiTransform,
  UiBackgroundProps,
  OnClick
} from './components'
import { CommonProps } from './components/types'

export type EcsElements = {
  // TODO: Remove Omit when onClick its handled Unity Side
  entity: Partial<Omit<EntityComponents, 'onClick'> & CommonProps>
}

// TODO: Remove Omit when onClick its handled Unity Side
export type EntityComponents = {
  uiTransform: PBUiTransform
  uiText: UiTextProps
  uiBackground: UiBackgroundProps
  onClick: OnClick
}

export namespace JSX {
  export interface Element {}
  export type IntrinsicElements = EcsElements
  export interface Component {}
}

export namespace ReactEcs {
  export namespace JSX {
    export interface Element {}
    export type IntrinsicElements = EcsElements
    export interface Component {}
  }
  export const createElement: any = (React as any).createElement as any
}
