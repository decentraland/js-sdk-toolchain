import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { PBVirtualCamera, VirtualCamera } from '../generated/index.gen'
import { CameraTransition } from '../generated/pb/decentraland/sdk/components/common/camera_transition.gen'

/**
 * @public
 */
export interface CameraTransitionHelper {
  /**
   * @returns a CameraTransition speed
   */
  Speed: (speed: number) => CameraTransition['transitionMode']
  /**
   * @returns a CameraTransition time
   */
  Time: (time: number) => CameraTransition['transitionMode']
}

/**
 * @public
 */
export interface VirtualCameraComponentDefinitionExtended extends
  LastWriteWinElementSetComponentDefinition<PBVirtualCamera> {
  /**
   * Camera transition helper for time and speed modes
   */
  Transition: CameraTransitionHelper
}

const CameraTransitionHelper: CameraTransitionHelper = {
  Speed(speed) {
    return {
      $case: 'speed' as const,
      speed
    }
  },
  Time(time) {
    return {
      $case: 'time' as const,
      time
    }
  }
}

export function defineVirtualCameraComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): VirtualCameraComponentDefinitionExtended {
  const theComponent = VirtualCamera(engine)

  return {
    ...theComponent,
    Transition: CameraTransitionHelper
  }
}
