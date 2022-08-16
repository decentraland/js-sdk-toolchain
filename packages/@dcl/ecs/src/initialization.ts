/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine } from './engine'
import { createRendererTransport } from './systems/crdt/transports/rendererTransport'
import { createNetworkTransport } from './systems/crdt/transports/networkTransport'

const rendererTransport = createRendererTransport()
export const engine = Engine({
  transports: [rendererTransport, createNetworkTransport()]
})

if (dcl) {
  dcl.loadModule('@decentraland/ExperimentalAPI', {}).catch(dcl.error)

  async function pullRendererMessages() {
    const response = await dcl.callRpc(
      '@decentraland/ExperimentalAPI',
      'messageFromRenderer',
      []
    )

    if (response.data?.length) {
      if (rendererTransport.onmessage) {
        for (const byteArray of response.data) {
          rendererTransport.onmessage(byteArray)
        }
      }
    }
  }

  dcl.onUpdate((dt: number) => {
    pullRendererMessages()
      .catch(dcl.error)
      .finally(() => engine.update(dt))
  })
}

/** @public */
export const Transform = engine.baseComponents.Transform
/** @public */
export const Animator = engine.baseComponents.Animator
/** @public */
export const AudioSource = engine.baseComponents.AudioSource
/** @public */
export const AvatarAttach = engine.baseComponents.AvatarAttach
/** @public */
export const AvatarShape = engine.baseComponents.AvatarShape
/** @public */
export const Billboard = engine.baseComponents.Billboard
/** @public */
export const BoxShape = engine.baseComponents.BoxShape
/** @public */
export const CameraMode = engine.baseComponents.CameraMode
/** @public */
export const CameraModeArea = engine.baseComponents.CameraModeArea
/** @public */
export const CylinderShape = engine.baseComponents.CylinderShape
/** @public */
export const GLTFShape = engine.baseComponents.GLTFShape
/** @public */
export const NFTShape = engine.baseComponents.NFTShape
/** @public */
export const OnPointerDown = engine.baseComponents.OnPointerDown
/** @public */
export const OnPointerDownResult = engine.baseComponents.OnPointerDownResult
/** @public */
export const OnPointerUp = engine.baseComponents.OnPointerUp
/** @public */
export const OnPointerUpResult = engine.baseComponents.OnPointerUpResult
/** @public */
export const PlaneShape = engine.baseComponents.PlaneShape
/** @public */
export const PointerLock = engine.baseComponents.PointerLock
/** @public */
export const SphereShape = engine.baseComponents.SphereShape
/** @public */
export const TextShape = engine.baseComponents.TextShape

/** @public */
export namespace Components {
  /** @public */
  export const Transform = engine.baseComponents.Transform
  /** @public */
  export const Animator = engine.baseComponents.Animator
  /** @public */
  export const AudioSource = engine.baseComponents.AudioSource
  /** @public */
  export const AvatarAttach = engine.baseComponents.AvatarAttach
  /** @public */
  export const AvatarShape = engine.baseComponents.AvatarShape
  /** @public */
  export const Billboard = engine.baseComponents.Billboard
  /** @public */
  export const BoxShape = engine.baseComponents.BoxShape
  /** @public */
  export const CameraMode = engine.baseComponents.CameraMode
  /** @public */
  export const CameraModeArea = engine.baseComponents.CameraModeArea
  /** @public */
  export const CylinderShape = engine.baseComponents.CylinderShape
  /** @public */
  export const GLTFShape = engine.baseComponents.GLTFShape
  /** @public */
  export const NFTShape = engine.baseComponents.NFTShape
  /** @public */
  export const OnPointerDown = engine.baseComponents.OnPointerDown
  /** @public */
  export const OnPointerDownResult = engine.baseComponents.OnPointerDownResult
  /** @public */
  export const OnPointerUp = engine.baseComponents.OnPointerUp
  /** @public */
  export const OnPointerUpResult = engine.baseComponents.OnPointerUpResult
  /** @public */
  export const PlaneShape = engine.baseComponents.PlaneShape
  /** @public */
  export const PointerLock = engine.baseComponents.PointerLock
  /** @public */
  export const SphereShape = engine.baseComponents.SphereShape
  /** @public */
  export const TextShape = engine.baseComponents.TextShape
}
