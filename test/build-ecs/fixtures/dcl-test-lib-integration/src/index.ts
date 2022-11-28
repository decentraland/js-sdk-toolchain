import { engine } from '@dcl/ecs'
import { keccak256 } from 'ethers/lib/utils'
// import { errors } from 'ethers/lib.esm/ethers' ethers generate conflicts with the console

import {} from 'js-sha3'

export function test() {
  console.log(engine.PlayerEntity)
  return keccak256
}
