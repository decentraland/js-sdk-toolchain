import { ColliderLayer, PBMeshCollider, PBMeshCollider_CylinderMesh } from '@dcl/ecs'
import { fromMeshCollider, toMeshCollider, isValidInput } from './utils'
import { MeshColliderInput } from './types'
import { MeshType } from '../MeshRendererInspector/types'

describe('fromMeshCollider', () => {
  it('should convert from sphere mesh collider', () => {
    const value: PBMeshCollider = {
      mesh: {
        $case: 'sphere',
        sphere: {}
      }
    }

    const result = fromMeshCollider(value)

    expect(result.collisionMask).toBe(ColliderLayer.CL_PHYSICS.toString())
    expect(result.mesh).toBe(MeshType.MT_SPHERE)
  })

  it('should convert from cylinder mesh collider with radius', () => {
    const value: PBMeshCollider = {
      mesh: {
        $case: 'cylinder',
        cylinder: {
          radiusTop: 0.75,
          radiusBottom: 1.25
        }
      }
    }

    const result = fromMeshCollider(value)

    expect(result.collisionMask).toBe(ColliderLayer.CL_PHYSICS.toString())
    expect(result.mesh).toBe(MeshType.MT_CYLINDER)
    expect(result.radiusTop).toBe('0.75')
    expect(result.radiusBottom).toBe('1.25')
  })

  it('should convert from plane mesh collider', () => {
    const value: PBMeshCollider = {
      mesh: {
        $case: 'plane',
        plane: {}
      }
    }

    const result = fromMeshCollider(value)

    expect(result.collisionMask).toBe(ColliderLayer.CL_PHYSICS.toString())
    expect(result.mesh).toBe(MeshType.MT_PLANE)
  })

  it('should convert from box mesh collider', () => {
    const value: PBMeshCollider = {
      mesh: {
        $case: 'box',
        box: {}
      }
    }

    const result = fromMeshCollider(value)

    expect(result.collisionMask).toBe(ColliderLayer.CL_PHYSICS.toString())
    expect(result.mesh).toBe(MeshType.MT_BOX)
  })

  it('should default to box mesh collider when the case is not recognized', () => {
    const value: any = {
      mesh: {
        $case: 'unknown'
      }
    }

    const result = fromMeshCollider(value)

    expect(result.collisionMask).toBe(ColliderLayer.CL_PHYSICS.toString())
    expect(result.mesh).toBe(MeshType.MT_BOX)
  })
})

describe('toMeshCollider', () => {
  it('should convert to sphere mesh collider', () => {
    const value: MeshColliderInput = {
      collisionMask: ColliderLayer.CL_PHYSICS.toString(),
      mesh: MeshType.MT_SPHERE
    }

    const result = toMeshCollider(value) as { collisionMask: number; mesh: { $case: 'sphere'; sphere: object } }

    expect(result.collisionMask).toBe(Number(ColliderLayer.CL_PHYSICS))
    expect(result.mesh.$case).toBe(MeshType.MT_SPHERE)
  })

  it('should convert to cylinder mesh collider with radius', () => {
    const value: MeshColliderInput = {
      collisionMask: ColliderLayer.CL_PHYSICS.toString(),
      mesh: MeshType.MT_CYLINDER,
      radiusTop: '0.75',
      radiusBottom: '1.25'
    }

    const result = toMeshCollider(value) as {
      collisionMask: number
      mesh: { $case: 'cylinder'; cylinder: PBMeshCollider_CylinderMesh }
    }

    expect(result.collisionMask).toBe(Number(ColliderLayer.CL_PHYSICS))
    expect(result.mesh.$case).toBe(MeshType.MT_CYLINDER)
    expect(result.mesh.cylinder.radiusTop).toBe(0.75)
    expect(result.mesh.cylinder.radiusBottom).toBe(1.25)
  })

  it('should convert to plane mesh collider', () => {
    const value: MeshColliderInput = {
      collisionMask: ColliderLayer.CL_PHYSICS.toString(),
      mesh: MeshType.MT_PLANE
    }

    const result = toMeshCollider(value) as { collisionMask: number; mesh: { $case: 'plane'; plane: object } }

    expect(result.collisionMask).toBe(Number(ColliderLayer.CL_PHYSICS))
    expect(result.mesh.$case).toBe(MeshType.MT_PLANE)
  })

  it('should convert to box mesh collider', () => {
    const value: MeshColliderInput = {
      collisionMask: ColliderLayer.CL_PHYSICS.toString(),
      mesh: MeshType.MT_BOX
    }

    const result = toMeshCollider(value) as { collisionMask: number; mesh: { $case: 'box'; box: object } }

    expect(result.collisionMask).toBe(Number(ColliderLayer.CL_PHYSICS))
    expect(result.mesh.$case).toBe(MeshType.MT_BOX)
  })

  it('should default to box mesh collider when the type is not recognized', () => {
    const value: any = {
      collisionMask: ColliderLayer.CL_PHYSICS.toString(),
      mesh: 'unknown'
    }

    const result = toMeshCollider(value) as any

    expect(result.collisionMask).toBe(Number(ColliderLayer.CL_PHYSICS))
    expect(result.mesh.$case).toBe(MeshType.MT_BOX)
  })
})

describe('isValidInput', () => {
  it('should return true', () => {
    const result = isValidInput()
    expect(result).toBe(true)
  })
})
