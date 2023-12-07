import { PBNftShape, NftFrameType } from '@dcl/ecs'
import { Color3 } from '@dcl/ecs-math'

import { fromNftShape, toNftShape, isValidUrn, isValidInput } from './utils'

describe('NftShapeUtils', () => {
  const exampleNftShape: PBNftShape = {
    urn: 'urn:example:123',
    color: Color3.White(),
    style: NftFrameType.NFT_BAROQUE_ORNAMENT
  }

  const exampleNftShapeInput = {
    urn: 'urn:example:123',
    color: '#FFFFFF',
    style: '1'
  }

  describe('fromNftShape', () => {
    it('converts PBNftShape to NftShapeInput', () => {
      const result = fromNftShape(exampleNftShape)
      expect(result).toEqual(exampleNftShapeInput)
    })

    it('handles undefined color in PBNftShape', () => {
      const result = fromNftShape({ urn: 'urn:example:123', style: NftFrameType.NFT_BAROQUE_ORNAMENT })
      expect(result).toEqual({ urn: 'urn:example:123', color: undefined, style: '1' })
    })
  })

  describe('toNftShape', () => {
    it('converts NftShapeInput to PBNftShape', () => {
      const result = toNftShape(exampleNftShapeInput)
      expect(result).toEqual(exampleNftShape)
    })

    it('handles undefined color in NftShapeInput', () => {
      const result = toNftShape({ urn: 'urn:example:123', style: '1' })
      expect(result).toEqual({ urn: 'urn:example:123', color: undefined, style: NftFrameType.NFT_BAROQUE_ORNAMENT })
    })
  })

  describe('isValidUrn', () => {
    it('returns true for a valid urn', () => {
      const result = isValidUrn('urn:example:123')
      expect(result).toBe(true)
    })

    it('returns false for an invalid urn', () => {
      const result = isValidUrn('invalid_urn')
      expect(result).toBe(false)
    })
  })

  describe('isValidInput', () => {
    it('returns true for a valid input', () => {
      const result = isValidInput('urn:example:123')
      expect(result).toBe(true)
    })

    it('returns false for an invalid input', () => {
      const result = isValidInput('invalid_input')
      expect(result).toBe(false)
    })
  })
})
