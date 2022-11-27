/* eslint-disable @typescript-eslint/no-empty-interface */
import { EventSystemCallback } from '@dcl/ecs'
import React from 'react'
import { UiTextProps, PBUiTransform, UiBackgroundProps } from './components'
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
  onClick: EventSystemCallback
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
