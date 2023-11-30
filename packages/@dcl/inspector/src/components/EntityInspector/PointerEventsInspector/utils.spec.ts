import { InputAction, PointerEventType } from '@dcl/ecs'
import { mapValueToInputAction, getDefaultPointerEvent, INPUT_ACTIONS, POINTER_EVENTS_TYPES, DEFAULTS } from './utils'

describe('InputUtils', () => {
  describe('mapValueToInputAction', () => {
    it('maps value to InputAction', () => {
      const result = mapValueToInputAction('1')
      expect(result).toBe(INPUT_ACTIONS[1].value)
    })

    it('returns undefined for invalid value', () => {
      const result = mapValueToInputAction('invalid')
      expect(result).toBeUndefined()
    })
  })

  describe('getDefaultPointerEvent', () => {
    it('returns default pointer event', () => {
      const result = getDefaultPointerEvent()
      const expected = {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: {
          button: InputAction.IA_ANY,
          hoverText: 'Interact',
          maxDistance: 10,
          showFeedback: true
        }
      }
      expect(result).toEqual(expected)
    })

    it('overrides default values with provided values', () => {
      const result = getDefaultPointerEvent({
        eventType: PointerEventType.PET_DOWN,
        eventInfo: {
          button: InputAction.IA_PRIMARY,
          hoverText: 'Custom Interaction',
          maxDistance: 15,
          showFeedback: false
        }
      })
      const expected = {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: {
          button: InputAction.IA_PRIMARY,
          hoverText: 'Custom Interaction',
          maxDistance: 15,
          showFeedback: false
        }
      }
      expect(result).toEqual(expected)
    })
  })

  describe('Constants', () => {
    it('INPUT_ACTIONS has correct length', () => {
      expect(INPUT_ACTIONS).toHaveLength(14)
    })

    it('POINTER_EVENTS_TYPES has correct length', () => {
      expect(POINTER_EVENTS_TYPES).toHaveLength(4)
    })

    it('DEFAULTS has correct values', () => {
      const expected = {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: {
          button: InputAction.IA_ANY,
          hoverText: 'Interact',
          maxDistance: 10,
          showFeedback: true
        }
      }
      expect(DEFAULTS).toEqual(expected)
    })
  })
})
