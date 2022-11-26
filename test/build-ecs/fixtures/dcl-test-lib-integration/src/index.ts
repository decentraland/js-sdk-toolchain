import { engine } from '@dcl/ecs'
import { errors } from 'ethers/lib.esm/ethers'

// TODO: types + rollup for type check
export function test() {
  console.log(engine.PlayerEntity)
  return errors
}
