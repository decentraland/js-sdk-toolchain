import { AnimationGroup } from '@babylonjs/core'
import { Entity, Animator } from '@dcl/ecs'

import { fromNumber, toNumber, isValidWeight, isValidSpeed, initializeAnimatorComponent } from './utils'

import { SdkContextValue } from '../../../lib/sdk/context'

jest.mock('../../../lib/sdk/context')

describe('NumberUtils', () => {
  describe('fromNumber', () => {
    it('converts number to multiplied value', () => {
      const result = fromNumber(50, 2)
      expect(result).toBe(100)
    })

    it('converts string to multiplied value', () => {
      const result = fromNumber('50', 2)
      expect(result).toBe(100)
    })
  })

  describe('toNumber', () => {
    it('converts number to divided value', () => {
      const result = toNumber(100, 2)
      expect(result).toBe(50)
    })

    it('converts string to divided value', () => {
      const result = toNumber('100', 2)
      expect(result).toBe(50)
    })
  })

  describe('isValidWeight', () => {
    it('returns true for a valid weight', () => {
      const result = isValidWeight('50')
      expect(result).toBe(true)
    })

    it('returns false for an invalid weight', () => {
      const result = isValidWeight('invalid')
      expect(result).toBe(false)
    })
  })

  describe('isValidSpeed', () => {
    it('returns true for a valid speed', () => {
      const result = isValidSpeed('100')
      expect(result).toBe(true)
    })

    it('returns false for an invalid speed', () => {
      const result = isValidSpeed('invalid')
      expect(result).toBe(false)
    })
  })

  describe('initializeAnimatorComponent', () => {
    it('initializes animator component with provided animations', async () => {
      const sdk = {
        operations: {
          addComponent: jest.fn(),
          updateValue: jest.fn(),
          dispatch: jest.fn()
        }
      }
      const entity: Entity = 512 as Entity
      const animations: AnimationGroup[] = [{ name: 'animation' }] as AnimationGroup[]

      const result = await initializeAnimatorComponent(sdk as any as SdkContextValue, entity, animations)

      expect(result).toEqual({
        states: [{ clip: 'animation', playing: false, weight: 1, speed: 1, loop: false, shouldReset: false }]
      })
      expect(sdk.operations.addComponent).toHaveBeenCalledWith(entity, Animator.componentId)
      expect(sdk.operations.updateValue).toHaveBeenCalledWith(Animator, entity, result)
      expect(sdk.operations.dispatch).toHaveBeenCalled()
    })
  })
})
