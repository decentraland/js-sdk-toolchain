import * as ecs from '@dcl/ecs'
import { pollEvents } from './observables'

export async function onUpdate(deltaTime: number) {
  await ecs.onUpdate(deltaTime)
  await pollEvents()
}
