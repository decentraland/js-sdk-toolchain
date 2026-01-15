# Material.getFlat() API

## Overview

The `getFlat()` method provides a simplified, flattened interface for accessing and modifying Material component properties. It eliminates the need to navigate deeply nested union structures (`PBR` vs `Unlit`, `texture` vs `avatarTexture` vs `videoTexture`), making material manipulation more intuitive and less error-prone.

### Compile-Time Sync Validation

The `FlatMaterial` interface includes compile-time type assertions that ensure it stays in sync with the generated protobuf types (`PBMaterial_PbrMaterial` and `PBMaterial_UnlitMaterial`). If a new property is added to the protobuf definitions, the build will fail with a descriptive error until `FlatMaterial` is updated:

```typescript
// Example error when 'glossiness' is added to PBMaterial_PbrMaterial but not to FlatMaterial:
// Type 'boolean' is not assignable to type '{ error: "FlatMaterial is missing PBR properties"; missing: "glossiness"; }'
```

This ensures the API stays complete as the Material schema evolves.

## Motivation

The Material component in Decentraland SDK uses a complex nested structure with discriminated unions:

```typescript
// Before: Complex nested access pattern
const mat = Material.get(entity)
if (mat.material?.$case === 'pbr') {
  if (mat.material.pbr.texture?.tex?.$case === 'texture') {
    const src = mat.material.pbr.texture.tex.texture.src
  }
}
```

```typescript
// After: Simple flat access pattern
const src = Material.getFlat(entity).texture.src
```

## API Reference

### `Material.getFlat(entity: Entity): FlatMaterial`

Returns a `FlatMaterial` accessor object that provides direct read/write access to material properties.

**Throws:** Error if the entity does not have a Material component.

### FlatMaterial Interface

```typescript
interface FlatMaterial {
  // Texture accessors (all return FlatTexture)
  readonly texture: FlatTexture // Main texture (PBR + Unlit)
  readonly alphaTexture: FlatTexture // Alpha texture (PBR + Unlit)
  readonly emissiveTexture: FlatTexture // Emissive texture (PBR only)
  readonly bumpTexture: FlatTexture // Bump/normal texture (PBR only)

  // Shared properties (PBR + Unlit)
  alphaTest: number | undefined // Alpha test threshold (0-1)
  castShadows: boolean | undefined // Whether material casts shadows

  // PBR-only properties
  albedoColor: Color4 | undefined // Base color
  emissiveColor: Color3 | undefined // Emissive/glow color
  reflectivityColor: Color3 | undefined // Reflectivity color
  transparencyMode: MaterialTransparencyMode | undefined
  metallic: number | undefined // Metallic value (0-1)
  roughness: number | undefined // Roughness value (0-1)
  specularIntensity: number | undefined // Specular intensity
  emissiveIntensity: number | undefined // Emissive intensity
  directIntensity: number | undefined // Direct light intensity

  // Unlit-only property
  diffuseColor: Color4 | undefined // Diffuse color (Unlit only)
}
```

### FlatTexture Interface

```typescript
interface FlatTexture {
  src: string | undefined
  wrapMode: TextureWrapMode | undefined
  filterMode: TextureFilterMode | undefined
}
```

## Usage Examples

### Reading Properties

```typescript
// Read texture source
const textureSrc = Material.getFlat(entity).texture.src

// Read PBR properties
const metallic = Material.getFlat(entity).metallic
const roughness = Material.getFlat(entity).roughness
const albedoColor = Material.getFlat(entity).albedoColor

// Read shared properties
const alphaTest = Material.getFlat(entity).alphaTest
const castShadows = Material.getFlat(entity).castShadows

// Read Unlit-only property
const diffuseColor = Material.getFlat(entity).diffuseColor
```

### Writing Properties

```typescript
// Update texture source
Material.getFlat(entity).texture.src = 'newTexture.png'

// Update texture wrap/filter modes
Material.getFlat(entity).texture.wrapMode = TextureWrapMode.TWM_MIRROR
Material.getFlat(entity).texture.filterMode = TextureFilterMode.TFM_TRILINEAR

// Update PBR properties
Material.getFlat(entity).metallic = 0.9
Material.getFlat(entity).roughness = 0.2
Material.getFlat(entity).albedoColor = { r: 1, g: 0, b: 0, a: 1 }
Material.getFlat(entity).transparencyMode = MaterialTransparencyMode.MTM_ALPHA_BLEND

// Update shared properties
Material.getFlat(entity).alphaTest = 0.5
Material.getFlat(entity).castShadows = false
```

### Chained Updates

```typescript
const flat = Material.getFlat(entity)
flat.texture.src = 'metal.png'
flat.metallic = 0.95
flat.roughness = 0.1
flat.albedoColor = { r: 0.8, g: 0.8, b: 0.9, a: 1 }
flat.castShadows = true
```

### Working with Different Textures

```typescript
const flat = Material.getFlat(entity)

// Main texture
flat.texture.src = 'diffuse.png'

// Alpha texture
flat.alphaTexture.src = 'alpha.png'

// Emissive texture (PBR only)
flat.emissiveTexture.src = 'glow.png'

// Bump/normal texture (PBR only)
flat.bumpTexture.src = 'normal.png'
```

## Behavior Details

### Reading Properties

| Material Type | Property Type                     | Behavior            |
| ------------- | --------------------------------- | ------------------- |
| PBR           | PBR-only (e.g., `metallic`)       | Returns the value   |
| PBR           | Unlit-only (e.g., `diffuseColor`) | Returns `undefined` |
| PBR           | Shared (e.g., `alphaTest`)        | Returns the value   |
| Unlit         | PBR-only (e.g., `metallic`)       | Returns `undefined` |
| Unlit         | Unlit-only (e.g., `diffuseColor`) | Returns the value   |
| Unlit         | Shared (e.g., `alphaTest`)        | Returns the value   |

### Writing Properties

| Material Type | Property Type                     | Behavior         |
| ------------- | --------------------------------- | ---------------- |
| PBR           | PBR-only (e.g., `metallic`)       | Sets the value   |
| PBR           | Unlit-only (e.g., `diffuseColor`) | **Throws Error** |
| PBR           | Shared (e.g., `alphaTest`)        | Sets the value   |
| Unlit         | PBR-only (e.g., `metallic`)       | **Throws Error** |
| Unlit         | Unlit-only (e.g., `diffuseColor`) | Sets the value   |
| Unlit         | Shared (e.g., `alphaTest`)        | Sets the value   |

### Texture Handling

| Texture Type                                | Reading             | Writing                                 |
| ------------------------------------------- | ------------------- | --------------------------------------- |
| Regular texture (`Material.Texture.Common`) | Returns values      | Sets values                             |
| Avatar texture (`Material.Texture.Avatar`)  | Returns `undefined` | **Throws Error**                        |
| Video texture (`Material.Texture.Video`)    | Returns `undefined` | **Throws Error**                        |
| No texture set                              | Returns `undefined` | Creates texture structure automatically |

### Auto-creation of Texture Structures

When setting a texture property (e.g., `texture.src`) on a material that doesn't have a texture defined, the accessor automatically creates the necessary nested structure:

```typescript
// Material created without texture
Material.setPbrMaterial(entity, { metallic: 0.5 })

// Setting src creates the texture structure automatically
Material.getFlat(entity).texture.src = 'newTexture.png'

// Now the material has a proper texture structure
```

## Error Handling

### Entity Without Material Component

```typescript
const entity = engine.addEntity()
// No Material.setPbrMaterial() or Material.setBasicMaterial() called

Material.getFlat(entity) // Throws: Entity does not have Material component
```

### Writing PBR Property on Unlit Material

```typescript
Material.setBasicMaterial(entity, {})
Material.getFlat(entity).metallic = 0.5 // Throws: "Cannot set metallic on Unlit material. Use PBR material instead."
```

### Writing Unlit Property on PBR Material

```typescript
Material.setPbrMaterial(entity, {})
Material.getFlat(entity).diffuseColor = { r: 1, g: 0, b: 0, a: 1 } // Throws: "Cannot set diffuseColor on PBR material. Use Unlit material instead."
```

### Modifying Special Textures

```typescript
Material.setPbrMaterial(entity, {
  texture: Material.Texture.Avatar({ userId: '0xabc' })
})
Material.getFlat(entity).texture.src = 'test.png' // Throws: "Cannot set texture properties on Avatar texture."
```

## Implementation Notes

### Architecture

The implementation uses two accessor classes:

1. **`FlatMaterialAccessor`**: Implements `FlatMaterial` interface with getters/setters for all material properties.
2. **`FlatTextureAccessor`**: Implements `FlatTexture` interface with getters/setters for texture properties.

Both classes hold a reference to a `getMaterial()` function that returns the mutable material, ensuring that reads and writes always operate on the current state.

### Performance Considerations

- The `getFlat()` method creates new accessor instances on each call
- The accessor uses lazy evaluation - properties are only read/written when accessed
- For frequent updates in hot paths, consider caching the `FlatMaterial` reference:

```typescript
// Cache the accessor if making many updates
const flat = Material.getFlat(entity)
flat.metallic = 0.9
flat.roughness = 0.1
// ... more updates
```

### Type Safety

- PBR-only properties return `undefined` when read on Unlit materials (no runtime error)
- Writing incompatible properties throws descriptive errors at runtime
- TypeScript types reflect the nullable nature of all properties
