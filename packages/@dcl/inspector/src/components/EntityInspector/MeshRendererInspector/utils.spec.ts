import {
  PBMeshRenderer,
  PBMeshRenderer_BoxMesh,
  PBMeshRenderer_CylinderMesh,
  PBMeshRenderer_PlaneMesh,
  PBMeshRenderer_SphereMesh
} from '@dcl/ecs'
import { fromMeshRenderer, toMeshRenderer, isValidInput, hasUvs } from './utils'
import { MeshRendererInput, MeshType } from './types'

describe('fromMeshRenderer', () => {
  it('should convert from sphere mesh', () => {
    const value: PBMeshRenderer = {
      mesh: {
        $case: 'sphere',
        sphere: {}
      }
    }

    const result = fromMeshRenderer(value)

    expect(result.mesh).toBe(MeshType.MT_SPHERE)
  })

  it('should convert from cylinder mesh with radius', () => {
    const value: PBMeshRenderer = {
      mesh: {
        $case: 'cylinder',
        cylinder: {
          radiusTop: 0.75,
          radiusBottom: 1.25
        }
      }
    }

    const result = fromMeshRenderer(value)

    expect(result.mesh).toBe(MeshType.MT_CYLINDER)
    expect(result.radiusTop).toBe('0.75')
    expect(result.radiusBottom).toBe('1.25')
  })

  it('should convert from plane mesh with uvs', () => {
    const value: PBMeshRenderer = {
      mesh: {
        $case: 'plane',
        plane: {
          uvs: [0.1, 0.2, 0.3, 0.4]
        }
      }
    }

    const result = fromMeshRenderer(value)

    expect(result.mesh).toBe(MeshType.MT_PLANE)
    expect(result.uvs).toBe('0.1,0.2,0.3,0.4')
  })

  it('should convert from box mesh with uvs', () => {
    const value: PBMeshRenderer = {
      mesh: {
        $case: 'box',
        box: {
          uvs: [0.1, 0.2, 0.3, 0.4]
        }
      }
    }

    const result = fromMeshRenderer(value)

    expect(result.mesh).toBe(MeshType.MT_BOX)
    expect(result.uvs).toBe('0.1,0.2,0.3,0.4')
  })

  it('should default to box mesh when the case is not recognized', () => {
    const value: any = {
      mesh: {
        $case: 'unknown'
      }
    }

    const result = fromMeshRenderer(value)

    expect(result.mesh).toBe(MeshType.MT_BOX)
  })
})

describe('toMeshRenderer', () => {
  it('should convert to sphere mesh', () => {
    const value: MeshRendererInput = {
      mesh: MeshType.MT_SPHERE
    }

    const result = toMeshRenderer(value) as { mesh: { $case: 'sphere'; sphere: PBMeshRenderer_SphereMesh } }

    expect(result.mesh.$case).toBe(MeshType.MT_SPHERE)
    expect(result.mesh.sphere).toStrictEqual({})
  })

  it('should convert to cylinder mesh with radius', () => {
    const value: MeshRendererInput = {
      mesh: MeshType.MT_CYLINDER,
      radiusTop: '0.75',
      radiusBottom: '1.25'
    }

    const result = toMeshRenderer(value) as { mesh: { $case: 'cylinder'; cylinder: PBMeshRenderer_CylinderMesh } }

    expect(result.mesh.$case).toBe(MeshType.MT_CYLINDER)
    expect(result.mesh.cylinder.radiusTop).toBe(0.75)
    expect(result.mesh.cylinder.radiusBottom).toBe(1.25)
  })

  it('should convert to plane mesh with uvs', () => {
    const value = {
      mesh: MeshType.MT_PLANE,
      uvs: '0.1,0.2,0.3,0.4'
    }

    const result = toMeshRenderer(value) as { mesh: { $case: 'plane'; plane: PBMeshRenderer_PlaneMesh } }

    expect(result.mesh.$case).toBe(MeshType.MT_PLANE)
    expect(result.mesh.plane.uvs).toEqual([])
  })

  it('should convert to box mesh with uvs', () => {
    const value = {
      mesh: MeshType.MT_BOX,
      uvs: '0.1,0.2,0.3,0.4'
    }

    const result = toMeshRenderer(value) as { mesh: { $case: 'box'; box: PBMeshRenderer_BoxMesh } }

    expect(result.mesh.$case).toBe(MeshType.MT_BOX)
    expect(result.mesh.box.uvs).toEqual([])
  })

  it('should default to box mesh when the type is not recognized', () => {
    const value: any = {
      mesh: 'unknown'
    }

    const result = toMeshRenderer(value) as { mesh: { $case: 'box'; box: PBMeshRenderer_BoxMesh } }

    expect(result.mesh.$case).toBe(MeshType.MT_BOX)
  })
})

describe('isValidInput', () => {
  it('should return true', () => {
    const result = isValidInput()
    expect(result).toBe(true)
  })
})

describe('hasUvs', () => {
  it('should return true for plane mesh type', () => {
    const value = MeshType.MT_PLANE
    const result = hasUvs(value)
    expect(result).toBe(true)
  })

  it('should return true for box mesh type', () => {
    const value = MeshType.MT_BOX
    const result = hasUvs(value)
    expect(result).toBe(true)
  })

  it('should return false for other mesh types', () => {
    const value = MeshType.MT_CYLINDER
    const result = hasUvs(value)
    expect(result).toBe(false)
  })
})
