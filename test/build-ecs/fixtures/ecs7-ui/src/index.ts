import { renderUi } from '@dcl/react-ecs'
import { engine } from '@dcl/ecs'
import * as sdk from '@dcl/sdk'
import { ui } from './ui'

renderUi(ui)
engine.addEntity()

export async function onUpdate(dt: number) {
  await sdk.onUpdate(dt)
}

