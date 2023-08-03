import { RPC, Transport } from '@dcl/mini-rpc'
import { CameraRPC } from './types'

export class CameraClient extends RPC<CameraRPC.Method, CameraRPC.Params, CameraRPC.Result> {
  constructor(transport: Transport) {
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
