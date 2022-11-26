import { engine } from '@dcl/ecs'
import { pollEvents } from './observables'

export async function runTick(deltaTime: number) {
  await engine.update(deltaTime)
  await pollEvents()
}
