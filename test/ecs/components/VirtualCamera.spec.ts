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
        },
        fromEntity: 6,
        toEntity: 66
      },
      lookAtEntity: 35
    })
  })

  it('should serialize with time transition helper', () => {
    const newEngine = Engine()
    const vCamera = components.VirtualCamera(newEngine)
    testComponentSerialization(vCamera, {
      defaultTransition: {
        transitionMode: vCamera.Transition.Time(6),
        fromEntity: 9,
        toEntity: 99
      },
      lookAtEntity: 86
    })
  })

  it('should serialize with speed transition', () => {
    const newEngine = Engine()
    testComponentSerialization(components.VirtualCamera(newEngine), {
      defaultTransition: {
        transitionMode: {
          $case: 'speed',
          speed: 13
        },
        fromEntity: 9,
        toEntity: 99
      },
      lookAtEntity: 86
    })
  })

  it('should serialize with speed transition helper', () => {
    const newEngine = Engine()
    const vCamera = components.VirtualCamera(newEngine)
    testComponentSerialization(vCamera, {
      defaultTransition: {
        transitionMode: vCamera.Transition.Speed(15),
        fromEntity: 9,
        toEntity: 99
      },
      lookAtEntity: 86
    })
  })
})
