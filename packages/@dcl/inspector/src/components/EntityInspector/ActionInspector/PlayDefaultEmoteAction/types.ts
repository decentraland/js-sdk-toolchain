import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.PLAY_DEFAULT_EMOTE>>
  onUpdate: (value: ActionPayload<ActionType.PLAY_DEFAULT_EMOTE>) => void
}

export const EMOTE_OPTIONS = [
  { value: 'wave', label: 'Wave' },
  { value: 'fistpump', label: 'Fistpump' },
  { value: 'robot', label: 'Robot' },
  { value: 'raiseHand', label: 'Raise Hand' },
  { value: 'clap', label: 'Clap' },
  { value: 'money', label: 'Money' },
  { value: 'kiss', label: 'Kiss' },
  { value: 'tik', label: 'Tik' },
  { value: 'hammer', label: 'Hammer' },
  { value: 'tektonik', label: 'Tektonik' },
  { value: 'dontsee', label: "Don't See" },
  { value: 'handsair', label: 'Hands Air' },
  { value: 'shrug', label: 'Shrug' },
  { value: 'disco', label: 'Disco' },
  { value: 'dab', label: 'Dab' },
  { value: 'headexplode', label: 'Head Explode' },
  { value: 'buttonDown', label: 'Button Down' },
  { value: 'buttonFront', label: 'Button Front' },
  { value: 'getHit', label: 'Get Hit' },
  { value: 'knockOut', label: 'Knock Out' },
  { value: 'lever', label: 'Lever' },
  { value: 'openChest', label: 'Open Chest' },
  { value: 'openDoor', label: 'Open Door' },
  { value: 'punch', label: 'Punch' },
  { value: 'push', label: 'Push' },
  { value: 'swingWeaponOneHand', label: 'Swing Weapon One Hand' },
  { value: 'swingWeaponTwoHands', label: 'Swing Weapon Two Hands' },
  { value: 'throw', label: 'Throw' },
  { value: 'sittingChair1', label: 'Sitting Chair 1' },
  { value: 'sittingChair2', label: 'Sitting Chair 2' },
  { value: 'sittingGround1', label: 'Sitting Ground 1' },
  { value: 'sittingGround2', label: 'Sitting Ground 2' }
]
