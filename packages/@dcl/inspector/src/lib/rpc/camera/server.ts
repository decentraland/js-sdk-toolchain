import { Engine, FreeCamera, ScreenshotTools, Vector3 } from '@babylonjs/core'
import { RPC } from '../../logic/rpc'
import { CameraRPC } from './types'

export class CameraServer extends RPC<string, object, CameraRPC.Method, CameraRPC.Params, CameraRPC.Result> {
  constructor(transport: RPC.Transport, engine: Engine, camera: FreeCamera) {
    super(CameraRPC.name, transport)

    this.handle('set_position', async ({ x, y, z }) => {
      camera.position.set(x, y, z)
    })

    this.handle('set_target', async ({ x, y, z }) => {
      camera.setTarget(new Vector3(x, y, z))
    })

    this.handle('take_screenshot', async ({ width, height, precision }) => {
      return ScreenshotTools.CreateScreenshotAsync(engine, camera, { width, height, precision })
    })
  }
}
