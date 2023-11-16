import { PBNftShape, NftFrameType } from '@dcl/ecs'

import { toColor3, toHex } from '../../ui/ColorField/utils'
import { NftShapeInput } from './types'

export const fromNftShape = (value: PBNftShape): NftShapeInput => {
  return {
    urn: value.urn,
    color: value.color ? toHex(value.color) : undefined,
    style: (value.style ?? NftFrameType.NFT_NONE).toString(),
  }
}

export const toNftShape = (value: NftShapeInput): PBNftShape => {
  return {
    urn: value.urn,
    color: value.color ? toColor3(value.color) : undefined,
    style: Number(value.style || NftFrameType.NFT_NONE)
  }
}

export function isValidInput(urn: string): boolean {
  // validate urn
  return true
}

export const NFT_STYLES = [
  {
    value: 0,
    label: "Classic"
  },
  {
    value: 1,
    label: "Baroque Ornament"
  },
  {
    value: 2,
    label: "Diamond Ornament"
  },
  {
    value: 3,
    label: "Minimal Wide"
  },
  {
    value: 4,
    label: "Minimal Grey"
  },
  {
    value: 5,
    label: "Blocky"
  },
  {
    value: 6,
    label: "Gold Edges"
  },
  {
    value: 7,
    label: "Gold Carved"
  },
  {
    value: 8,
    label: "Gold Wide"
  },
  {
    value: 9,
    label: "Gold Rounded"
  },
  {
    value: 10,
    label: "Metal Medium"
  },
  {
    value: 11,
    label: "Metal Wide"
  },
  {
    value: 12,
    label: "Metal Slim"
  },
  {
    value: 13,
    label: "Metal Rounded"
  },
  {
    value: 14,
    label: "Pins"
  },
  {
    value: 15,
    label: "Minimal Black"
  },
  {
    value: 16,
    label: "Minimal White"
  },
  {
    value: 17,
    label: "Tape"
  },
  {
    value: 18,
    label: "Wood Slim"
  },
  {
    value: 19,
    label: "Wood Wide"
  },
  {
    value: 20,
    label: "Wood Twigs"
  },
  {
    value: 21,
    label: "Canvas"
  },
  {
    value: 22,
    label: "None"
  }
]
