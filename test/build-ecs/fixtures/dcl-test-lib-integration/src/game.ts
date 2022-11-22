import { engine, log } from '@dcl/sdk'
import { errors } from 'ethers/lib.esm/ethers'

// TODO: types + rollup for type check
export function test() {
  log(engine.PlayerEntity)
  return errors
}
