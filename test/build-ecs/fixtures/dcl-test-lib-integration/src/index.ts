import { engine } from '@dcl/ecs'
import { v4 } from 'uuid'

export function test() {
  const uuid = v4()
  console.log(engine.PlayerEntity, uuid)
  return uuid
}
