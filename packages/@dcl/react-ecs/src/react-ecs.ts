import React from 'react'
import renderer from './reconciler'

export namespace ReactEcs {
  export const createRenderer = renderer
  export const createElement: any = (React as any).createElement as any
}
