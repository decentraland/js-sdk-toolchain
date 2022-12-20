/* eslint-disable @typescript-eslint/no-empty-interface */
import {
  PBUiBackground,
  PBUiText,
  PBUiTransform,
  PBUiInput,
  EventSystemCallback
} from '@dcl/ecs'
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
  uiInput: PBUiInput
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
  // TODO: check if this as any is still needed
  export const createElement = (React as any).createElement
}
