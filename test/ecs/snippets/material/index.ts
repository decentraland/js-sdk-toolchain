import { Entity, engine, Transform, MeshRenderer, Material, MaterialTransparencyMode } from '@dcl/sdk/ecs'

function createSphere(x: number, y: number, z: number): Entity {
  const meshEntity = engine.addEntity()
  Transform.create(meshEntity, { position: { x, y, z } })
  MeshRenderer.create(meshEntity, { mesh: { $case: 'sphere', sphere: {} } })
  return meshEntity
}

Material.create(createSphere(15, 1, 15), {
  material: {
    $case: 'pbr',
    pbr: {
      albedoColor: { r: 0, g: 0, b: 1, a: 1 },
      reflectivityColor: { r: 0.5, g: 0.5, b: 0.5 },
      metallic: 0.8,
      roughness: 0.1
    }
  }
})

Material.create(createSphere(13, 1, 15), {
  material: {
    $case: 'pbr',
    pbr: {
      albedoColor: { r: 1, g: 1, b: 0, a: 1 },
      reflectivityColor: { r: 0.5, g: 0.5, b: 0.5 },
      metallic: 0.1,
      roughness: 0.8,

      alphaTest: 0.2,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
    }
  }
})

Material.create(createSphere(11, 1, 15), {
  material: {
    $case: 'pbr',
    pbr: {
      albedoColor: { r: 0, g: 0, b: 1, a: 1 },
      reflectivityColor: { r: 0.5, g: 0.5, b: 0.5 },
      metallic: 0.1,
      roughness: 0.1
    }
  }
})

// add textures
export {}
