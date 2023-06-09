import { engine, Name } from '@dcl/sdk/ecs'

export function main() {
  console.log({ name1: engine.getEntityOrNullByName('Magic Cube') })
  for (const [entity] of engine.getEntitiesWith(Name)) {
    console.log({ entity })
  }
}
