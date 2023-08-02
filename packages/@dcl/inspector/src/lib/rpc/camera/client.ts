import { RPC } from '../../logic/rpc'
import { CameraRPC } from './types'

export class CameraClient extends RPC<string, object, CameraRPC.Method, CameraRPC.Params, CameraRPC.Result> {
  constructor(transport: RPC.Transport) {
    super(CameraRPC.name, transport)
  }

  takeScreenshot = (width: number, height: number, precision?: number) => {
    return this.request('take_screenshot', { width, height, precision })
  }

  setTarget = (x: number, y: number, z: number) => {
    return this.request('set_target', { x, y, z })
  }

  setPosition = (x: number, y: number, z: number) => {
    return this.request('set_position', { x, y, z })
  }
}
