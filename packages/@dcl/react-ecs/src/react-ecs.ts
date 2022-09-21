/* eslint-disable @typescript-eslint/no-empty-interface */
import React from 'react'
import { PBUiText, PBUiTransform, PBUiStyles } from './components'
import { CommonProps } from './components/types'

export type EcsElements = {
  entity: Partial<EntityComponents & CommonProps>
}

export type EntityComponents = {
  uiTransform: PBUiTransform
  uiText: PBUiText
  uiStyles: PBUiStyles
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
