import { engine } from '@dcl/ecs'
import { pollEvents } from './observables'

export async function onUpdate(deltaTime: number) {
  engine.update(deltaTime)
  await pollEvents()
}
