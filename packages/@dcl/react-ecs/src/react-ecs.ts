/* eslint-disable @typescript-eslint/no-empty-interface */
import { EventSystemCallback } from '@dcl/ecs'
import {
  PBUiBackground,
  PBUiText,
  PBUiTransform
} from '@dcl/ecs/dist/components'
import React from 'react'
import { CommonProps } from './components/types'

export type EcsElements = {
  // TODO: Remove Omit when onClick its handled Unity Side
  entity: Partial<Omit<EntityComponents, 'onClick'> & CommonProps>
}

// TODO: Remove Omit when onClick its handled Unity Side
export type EntityComponents = {
  uiTransform: PBUiTransform
  uiText: PBUiText
  uiBackground: PBUiBackground
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
