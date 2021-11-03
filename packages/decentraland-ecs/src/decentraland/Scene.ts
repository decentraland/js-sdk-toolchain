import { onEnterSceneObservable, onLeaveSceneObservable } from 'src'

/**
 * @public
 */
export namespace Scene {
  /**
   * @public
   */
  export type OnEnterLeaveOptions = {
    onlyCurrentUser: boolean
  }

  /**
   * TThese events are triggered after a character enters the scene.
   * @public
   */
  export function OnEnterScene(callback: (event: IEvents['onEnterScene']) => void, options?: OnEnterLeaveOptions) {
    ;async () => {
      let userId: string | null = null

      if (options && options.onlyCurrentUser) {
        const module = await dcl.loadModule('@decentraland/Identity', {})
        userId = (await dcl.callRpc(module.rpcHandle, 'getUserData', [])).userId
      }

      onEnterSceneObservable.add((e: IEvents['onEnterScene']) => {
        if (userId && userId !== e.userId) {
          return
        }
        callback(e)
      })
    }
  }

  /**
   * These events are triggered after a character leaves the scene.
   * @public
   */
  export function OnLeaveScene(callback: (event: IEvents['onLeaveScene']) => void, options?: OnEnterLeaveOptions) {
    ;async () => {
      let userId: string | null = null

      if (options && options.onlyCurrentUser) {
        const module = await dcl.loadModule('@decentraland/Identity', {})
        userId = (await dcl.callRpc(module.rpcHandle, 'getUserData', [])).userId
      }

      onLeaveSceneObservable.add((e: IEvents['onLeaveScene']) => {
        if (userId && userId !== e.userId) {
          return
        }
        callback(e)
      })
    }
  }
}
