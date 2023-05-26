/**
 * This is a map of keys (see enum Keys): boolean
 */
export const keyState: {
  [keyCode: number]: boolean
  [keyName: string]: boolean
} = {}

export enum Keys {
  KEY_W = 87,
  KEY_A = 65,
  KEY_F = 70,
  KEY_S = 83,
  KEY_D = 68,

  KEY_LEFT = 37,
  KEY_UP = 38,
  KEY_RIGHT = 39,
  KEY_DOWN = 40,

  KEY_SHIFT = -1,
  KEY_CTRL = -2,
  KEY_SPACE = 32,

  KEY_E = 69,
  KEY_Q = 81
}
