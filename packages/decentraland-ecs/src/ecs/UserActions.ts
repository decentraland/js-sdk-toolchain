let modulePromise: any

/**
 * teleport player to a destination
 * @param destination - "coordX,coordY", "magic", "crowd"
 * @public
 */
export function teleportTo(destination: string) {
  // error(`teleportTo(destination) was deprecated. Please use:

  // import {requestTeleport} from '@decentraland/UserActionModule'
  // executeTask(async () => {
  //   await requestTeleport(destination)
  // })`)
  callModuleRpc('requestTeleport', [destination])
}

function ensureModule(): boolean {
  if (typeof modulePromise === 'undefined' && typeof dcl !== 'undefined') {
    modulePromise = dcl.loadModule('@decentraland/UserActionModule', {})
  }
  return typeof modulePromise !== 'undefined' && typeof dcl !== 'undefined'
}

function callModuleRpc(methodName: string, args: any[]): void {
  if (ensureModule()) {
    modulePromise.then(($: any) => {
      dcl.callRpc($.rpcHandle, methodName, args)
    })
  }
}
