import { RPC, type Transport } from '@dcl/mini-rpc';

export const name = 'CameraRPC';

export enum Method {
  TAKE_SCREENSHOT = 'take_screenshot',
  SET_TARGET = 'set_target',
  SET_POSITION = 'set_position',
}

export type Params = {
  [Method.TAKE_SCREENSHOT]: { width: number; height: number; precision?: number };
  [Method.SET_TARGET]: { x: number; y: number; z: number };
  [Method.SET_POSITION]: { x: number; y: number; z: number };
};

export type Result = {
  [Method.TAKE_SCREENSHOT]: string;
  [Method.SET_TARGET]: void;
  [Method.SET_POSITION]: void;
};

export class CameraRPC extends RPC<Method, Params, Result> {
  constructor(transport: Transport) {
    super(name, transport);
  }

  takeScreenshot = (width: number, height: number, precision?: number) => {
    return this.request('take_screenshot', { width, height, precision });
  };

  setTarget = (x: number, y: number, z: number) => {
    return this.request('set_target', { x, y, z });
  };

  setPosition = (x: number, y: number, z: number) => {
    return this.request('set_position', { x, y, z });
  };
}
