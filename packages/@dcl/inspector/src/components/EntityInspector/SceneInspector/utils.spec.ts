import { EditorComponentsTypes, SceneAgeRating, SceneCategory } from '../../../lib/sdk/components'
import { TransitionMode } from '../../../lib/sdk/components/SceneMetadata'
import { Layout } from '../../../lib/utils/layout'
import { SceneInput } from './types'
import { fromScene, isValidInput, parseParcels, toScene } from './utils'

//TODO fix tests
function getInput(base: string, parcels: string): SceneInput {
  const input: SceneInput = {
    name: 'name',
    description: 'description',
    thumbnail: 'assets/scene/thumbnail.png',
    ageRating: 'T',
    categories: ['game'],
    tags: 'tag1, tag2',
    silenceVoiceChat: false,
    disablePortableExperiences: false,
    spawnPoints: [],
    author: 'John Doe',
    email: 'johndoe@gmail.com',
    skyboxConfig: {
      fixedTime: '36000',
      transitionMode: TransitionMode.TM_FORWARD.toString()
    },
    layout: {
      base,
      parcels
    }
  }
  return input
}

function getScene(layout: Layout): EditorComponentsTypes['Scene'] {
  const scene: EditorComponentsTypes['Scene'] = {
    name: 'name',
    description: 'description',
    thumbnail: 'assets/scene/thumbnail.png',
    ageRating: SceneAgeRating.Teen,
    categories: [SceneCategory.GAME],
    tags: ['tag1', 'tag2'],
    silenceVoiceChat: false,
    disablePortableExperiences: false,
    spawnPoints: [],
    author: 'John Doe',
    email: 'johndoe@gmail.com',
    layout,
    skyboxConfig: {
      fixedTime: 36000,
      transitionMode: TransitionMode.TM_FORWARD
    }
  }
  return scene
}

describe('SceneInspector/utils', () => {
  describe('fromScene', () => {
    it('should convert a Scene to a SceneInput', () => {
      const scene = getScene({
        base: { x: 1, y: 1 },
        parcels: [
          { x: 1, y: 1 },
          { x: 2, y: 2 }
        ]
      })

      const result = fromScene(scene)

      expect(result).toEqual(getInput('1,1', '1,1 2,2'))
    })
  })

  describe('toScene', () => {
    it('should convert a SceneInput to a Scene', () => {
      const input = getInput('1,1', '1,1 2,2')

      const result = toScene(input)

      expect(result).toEqual(
        getScene({
          base: { x: 1, y: 1 },
          parcels: [
            { x: 1, y: 1 },
            { x: 2, y: 2 }
          ]
        })
      )
    })
  })

  describe('parseParcels', () => {
    it('should parse a string of parcels into Coords array', () => {
      const input = '1,1 2,2 3,3'

      const result = parseParcels(input)

      expect(result).toEqual([
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 }
      ])
    })

    it('should return an empty array for invalid input', () => {
      const input = '1,1 2,2 invalid 3,3'

      const result = parseParcels(input)

      expect(result).toEqual([])
    })
  })

  describe('isValidInput', () => {
    it('should return true for connected parcels', () => {
      const validInput = getInput('1,1', '1,1 1,2')
      const invalidInput = getInput('1,1', '1,1 2,2')

      const isValidValidInput = isValidInput(validInput)
      const isValidInvalidInput = isValidInput(invalidInput)

      expect(isValidValidInput).toBe(true)
      expect(isValidInvalidInput).toBe(false)
    })

    it('should return true if parcels contains base coord', () => {
      const validInput = getInput('1,1', '1,1 1,2')
      const invalidInput = getInput('0,1', '1,1 2,2')

      const isValidValidInput = isValidInput(validInput)
      const isValidInvalidInput = isValidInput(invalidInput)

      expect(isValidValidInput).toBe(true)
      expect(isValidInvalidInput).toBe(false)
    })
  })
})
