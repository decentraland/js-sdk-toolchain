import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { engine } from '@dcl/sdk/ecs'
export * from '@dcl/sdk'
import { ui } from './ui'

ReactEcsRenderer.setUiRenderer(ui)
engine.addEntity()
