import { InputAction, PBPointerEvents_Entry, PBPointerEvents_Info, PointerEventType } from '@dcl/ecs'

export function mapValueToPointerEvent(value: string): PointerEventType | undefined {
  return POINTER_EVENTS_TYPES.find(($) => $.value === Number(value))?.value
}

export function mapValueToInputAction(value: string): InputAction | undefined {
  return INPUT_ACTIONS.find(($) => $.value === Number(value))?.value
}

export function getDefaultPointerEvent(
  def?: Partial<PBPointerEvents_Entry>
): PBPointerEvents_Entry & { eventInfo: Required<PBPointerEvents_Info> } {
  return {
    eventType: def?.eventType ?? PointerEventType.PET_DOWN,
    eventInfo: {
      button: InputAction.IA_ANY,
      hoverText: 'Interact',
      maxDistance: 10,
      showFeedback: true,
      ...def?.eventInfo
    }
  }
}

export const DEFAULTS = getDefaultPointerEvent()

export const INPUT_ACTIONS = [
  {
    value: 0,
    label: 'Pointer'
  },
  {
    value: 1,
    label: 'Primary'
  },
  {
    value: 2,
    label: 'Secondary'
  },
  {
    value: 3,
    label: 'Any'
  },
  {
    value: 4,
    label: 'Forward'
  },
  {
    value: 5,
    label: 'Backward'
  },
  {
    value: 6,
    label: 'Right'
  },
  {
    value: 7,
    label: 'Left'
  },
  {
    value: 8,
    label: 'Jump'
  },
  {
    value: 9,
    label: 'Walk'
  },
  {
    value: 10,
    label: 'Action 3'
  },
  {
    value: 11,
    label: 'Action 4'
  },
  {
    value: 12,
    label: 'Action 5'
  },
  {
    value: 13,
    label: 'Action 6'
  }
]

export const POINTER_EVENTS_TYPES = [
  {
    value: 0,
    label: 'Up'
  },
  {
    value: 1,
    label: 'Down'
  },
  {
    value: 2,
    label: 'Hover enter'
  },
  {
    value: 3,
    label: 'Hover leave'
  }
]
