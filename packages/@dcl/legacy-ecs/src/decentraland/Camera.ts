import { Vector3, Quaternion } from '@dcl/ecs-math'
import future from 'fp-future'
import { CameraMode } from './Types'

type CameraState = {
  /** Camera position, relative to the parcel. */
  position: { x: number; y: number; z: number }
  /** Camera rotation */
  rotation: { x: number; y: number; z: number; w: number }
  /** Camera position, absolute. */
  worldPosition: { x: number; y: number; z: number }
  /** Player height. */
  playerHeight: number
  /** Camera Mode. */
  cameraMode: CameraMode
}

let cameraInstance: Camera
let cameraPromise: Promise<Camera>
const cameraDefaultState: CameraState = {
  position: new Vector3(),
  rotation: new Quaternion(),
  worldPosition: new Vector3(),
  playerHeight: 1.16,
  cameraMode: CameraMode.ThirdPerson
}

/**
 * @public
 */
export class Camera {
  /** @deprecated Use Camera.getCamera() instead. */
  static get instance(): Camera {
    if (!cameraInstance) {
      const cameraState: CameraState = { ...cameraDefaultState }
      subscribeCameraState(cameraState).catch(() => {})
      cameraInstance = new Camera(cameraState)
    }
    return cameraInstance
  }

  static getCamera(): Promise<Camera> {
    if (!cameraPromise) {
      cameraPromise = createCamera().then((camera) => {
        cameraInstance = camera
        return Promise.resolve(cameraInstance)
      })
    }
    return cameraPromise
  }

  /** Camera position, relative to the parcel. */
  public readonly position: Vector3 = new Vector3()
  /** Camera rotation */
  public readonly rotation: Quaternion = new Quaternion()
  /** Feet position, relative to the parcel.  */
  public readonly feetPosition: Vector3 = new Vector3()
  /** Camera position, absolute. */
  public readonly worldPosition: Vector3 = new Vector3()

  /** Player height. */
  get playerHeight(): number {
    return this.state.playerHeight
  }

  /** Camera Mode. */
  get cameraMode(): CameraMode {
    return this.state.cameraMode
  }

  // @internal
  private state: CameraState

  // @internal
  constructor(cameraState: CameraState) {
    this.state = cameraState

    Object.defineProperty(this.position, 'x', {
      get: () => cameraState.position.x
    })

    Object.defineProperty(this.position, 'y', {
      get: () => cameraState.position.y
    })

    Object.defineProperty(this.position, 'z', {
      get: () => cameraState.position.z
    })

    Object.defineProperty(this.worldPosition, 'x', {
      get: () => cameraState.worldPosition.x
    })

    Object.defineProperty(this.worldPosition, 'y', {
      get: () => cameraState.worldPosition.y
    })

    Object.defineProperty(this.worldPosition, 'z', {
      get: () => cameraState.worldPosition.z
    })

    Object.defineProperty(this.feetPosition, 'x', {
      get: () => cameraState.position.x
    })

    Object.defineProperty(this.feetPosition, 'y', {
      get: () => cameraState.position.y - cameraState.playerHeight
    })

    Object.defineProperty(this.feetPosition, 'z', {
      get: () => cameraState.position.z
    })

    Object.defineProperty(this.rotation, 'x', {
      get: () => cameraState.rotation.x
    })

    Object.defineProperty(this.rotation, 'y', {
      get: () => cameraState.rotation.y
    })

    Object.defineProperty(this.rotation, 'z', {
      get: () => cameraState.rotation.z
    })

    Object.defineProperty(this.rotation, 'w', {
      get: () => cameraState.rotation.w
    })
  }
}

// it returns a promise of a camera which will be resolved
// when all the properties for the camera state are set
function createCamera(): Promise<Camera> {
  const cameraState: CameraState = { ...cameraDefaultState }
  return subscribeCameraState(cameraState).then(() => {
    return new Camera(cameraState)
  })
}

// subscribes and update a camera state to the events for properties changes
// it returns a promise that will be resolved when every property is set
function subscribeCameraState(cameraState: CameraState): Promise<void> {
  const positionSet = future()
  const rotationSet = future()
  const cameraModeSet = future()

  subscribeEvents({
    positionChanged: (ev) => {
      cameraState.position = ev.position
      cameraState.worldPosition = ev.cameraPosition
      cameraState.playerHeight = ev.playerHeight
      positionSet.resolve(true)
    },
    rotationChanged: (ev) => {
      cameraState.rotation = ev.quaternion
      rotationSet.resolve(true)
    },
    cameraModeChanged: (ev) => {
      cameraState.cameraMode = ev.cameraMode
      cameraModeSet.resolve(true)
    }
  })

  return Promise.all([positionSet, rotationSet, cameraModeSet]).then(() =>
    Promise.resolve()
  )
}

function subscribeEvents(opts: {
  positionChanged: (ev: IEvents['positionChanged']) => void
  rotationChanged: (ev: IEvents['rotationChanged']) => void
  cameraModeChanged: (ev: IEvents['cameraModeChanged']) => void
}) {
  if (typeof dcl !== 'undefined') {
    dcl.subscribe('positionChanged')
    dcl.subscribe('rotationChanged')
    dcl.subscribe('cameraModeChanged')

    dcl.onEvent((event) => {
      switch (event.type) {
        case 'positionChanged':
          opts.positionChanged(event.data as IEvents['positionChanged'])
          break
        case 'rotationChanged':
          opts.rotationChanged(event.data as IEvents['rotationChanged'])
          break
        case 'cameraModeChanged':
          opts.cameraModeChanged(event.data as IEvents['cameraModeChanged'])
          break
      }
    })
  }
}
