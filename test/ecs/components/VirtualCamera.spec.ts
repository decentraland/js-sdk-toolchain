import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('VirtualCamera component', () => {
  it('should serialize with time transition', () => {
    const newEngine = Engine()
    testComponentSerialization(components.VirtualCamera(newEngine), {
      defaultTransition: {
        transitionMode: {
          $case: 'time',
          time: 3
        }
      },
      lookAtEntity: 35,
      fov: 45
    })
  })

  it('should serialize with time transition helper', () => {
    const newEngine = Engine()
    const vCamera = components.VirtualCamera(newEngine)
    testComponentSerialization(vCamera, {
      defaultTransition: {
        transitionMode: vCamera.Transition.Time(6)
      },
      lookAtEntity: 86,
      fov: 50
    })
  })

  it('should serialize with speed transition', () => {
    const newEngine = Engine()
    testComponentSerialization(components.VirtualCamera(newEngine), {
      defaultTransition: {
        transitionMode: {
          $case: 'speed',
          speed: 13
        }
      },
      lookAtEntity: 86,
      fov: 30
    })
  })

  it('should serialize with speed transition helper', () => {
    const newEngine = Engine()
    const vCamera = components.VirtualCamera(newEngine)
    testComponentSerialization(vCamera, {
      defaultTransition: {
        transitionMode: vCamera.Transition.Speed(15)
      },
      lookAtEntity: 86,
      fov: 48
    })
  })
})
