import { LastWriteWinElementSetComponentDefinition, Entity, IEngine } from '../../engine'
import {
  Material,
  MaterialTransparencyMode,
  PBMaterial,
  PBMaterial_PbrMaterial,
  PBMaterial_UnlitMaterial
} from '../generated/index.gen'
import {
  AvatarTexture,
  Texture,
  TextureFilterMode,
  TextureUnion,
  TextureWrapMode,
  VideoTexture
} from '../generated/types.gen'
import { Color3, Color4 } from '../generated/pb/decentraland/common/colors.gen'

/**
 * @public
 */
export interface TextureHelper {
  /**
   * @returns a common texture with a source file
   */
  Common: (texture: Texture) => TextureUnion

  /**
   * @returns the avatar texture of userId specified
   */
  Avatar: (avatarTexture: AvatarTexture) => TextureUnion

  /**
   * @returns the video texture of videoPlayerEntity specified
   */
  Video: (videoTexture: VideoTexture) => TextureUnion
}

/**
 * Flattened texture interface for simplified property access
 * @public
 */
export interface FlatTexture {
  /** Path to the texture file */
  src: string | undefined
  /** Texture wrapping behavior */
  wrapMode: TextureWrapMode | undefined
  /** Texture filtering mode */
  filterMode: TextureFilterMode | undefined
}

/**
 * Texture field names that can be accessed via getFlat
 */
type TextureField = 'texture' | 'alphaTexture' | 'emissiveTexture' | 'bumpTexture'

/**
 * Flattened material interface for simplified property access
 * @public
 */
export interface FlatMaterial {
  /**
   * Access to the main texture properties (works for both PBR and Unlit materials)
   */
  readonly texture: FlatTexture

  /**
   * Access to the alpha texture properties (works for both PBR and Unlit materials)
   */
  readonly alphaTexture: FlatTexture

  /**
   * Access to the emissive texture properties (PBR only - returns undefined on Unlit)
   */
  readonly emissiveTexture: FlatTexture

  /**
   * Access to the bump/normal texture properties (PBR only - returns undefined on Unlit)
   */
  readonly bumpTexture: FlatTexture

  // Shared properties (PBR + Unlit)

  /**
   * Alpha test threshold (0-1). Default: 0.5
   */
  alphaTest: number | undefined

  /**
   * Whether the material casts shadows. Default: true
   */
  castShadows: boolean | undefined

  // PBR-only properties (return undefined on Unlit, throw on write to Unlit)

  /**
   * Albedo/base color (PBR only). Default: white
   */
  albedoColor: Color4 | undefined

  /**
   * Emissive color (PBR only). Default: black
   */
  emissiveColor: Color3 | undefined

  /**
   * Reflectivity color (PBR only). Default: white
   */
  reflectivityColor: Color3 | undefined

  /**
   * Transparency mode (PBR only). Default: MTM_AUTO
   */
  transparencyMode: MaterialTransparencyMode | undefined

  /**
   * Metallic value 0-1 (PBR only). Default: 0.5
   */
  metallic: number | undefined

  /**
   * Roughness value 0-1 (PBR only). Default: 0.5
   */
  roughness: number | undefined

  /**
   * Specular intensity (PBR only). Default: 1
   */
  specularIntensity: number | undefined

  /**
   * Emissive intensity (PBR only). Default: 2
   */
  emissiveIntensity: number | undefined

  /**
   * Direct light intensity (PBR only). Default: 1
   */
  directIntensity: number | undefined

  // Unlit-only property (return undefined on PBR, throw on write to PBR)

  /**
   * Diffuse color (Unlit only). Default: white
   */
  diffuseColor: Color4 | undefined
}

/**
 * @public
 */
export interface MaterialComponentDefinitionExtended extends LastWriteWinElementSetComponentDefinition<PBMaterial> {
  /**
   * Texture helpers with constructor
   */
  Texture: TextureHelper

  /**
   * Create or replace the component Material in the entity specified
   * @param entity - the entity to link the component
   * @param material - the Unlit data for this material
   */
  setBasicMaterial: (entity: Entity, material: PBMaterial_UnlitMaterial) => void

  /**
   * Create or replace the component Material in the entity specified
   * @param entity - the entity to link the component
   * @param material - the PBR data for this material
   */
  setPbrMaterial: (entity: Entity, material: PBMaterial_PbrMaterial) => void

  /**
   * Get a flattened accessor for the material's properties.
   * Simplifies reading/writing material properties without navigating nested unions.
   * Works for both PBR and Unlit materials.
   * @param entity - Entity with the Material component
   * @returns An accessor object with direct access to material properties
   *
   * @example
   * ```ts
   * // Set texture source
   * Material.getFlat(entity).texture.src = 'newTexture.png'
   *
   * // Set PBR properties
   * Material.getFlat(entity).metallic = 0.9
   * Material.getFlat(entity).roughness = 0.2
   * Material.getFlat(entity).albedoColor = { r: 1, g: 0, b: 0, a: 1 }
   *
   * // Set shared properties
   * Material.getFlat(entity).alphaTest = 0.8
   * Material.getFlat(entity).castShadows = false
   * ```
   */
  getFlat: (entity: Entity) => FlatMaterial
}

const TextureHelper: TextureHelper = {
  Common(texture: Texture) {
    return {
      tex: {
        $case: 'texture',
        texture
      }
    }
  },
  Avatar(avatarTexture: AvatarTexture) {
    return {
      tex: {
        $case: 'avatarTexture',
        avatarTexture
      }
    }
  },
  Video(videoTexture: VideoTexture) {
    return {
      tex: {
        $case: 'videoTexture',
        videoTexture
      }
    }
  }
}

/**
 * Helper to get the inner material object (pbr or unlit) from a PBMaterial
 */
function getInnerMaterial(mat: PBMaterial): PBMaterial_PbrMaterial | PBMaterial_UnlitMaterial | undefined {
  if (mat.material?.$case === 'pbr') {
    return mat.material.pbr
  } else if (mat.material?.$case === 'unlit') {
    return mat.material.unlit
  }
  return undefined
}

/**
 * Helper to get the Texture object from a TextureUnion (only for regular textures)
 */
function getTextureFromUnion(textureUnion: TextureUnion | undefined): Texture | undefined {
  if (textureUnion?.tex?.$case === 'texture') {
    return textureUnion.tex.texture
  }
  return undefined
}

/**
 * Check if a texture field is PBR-only
 */
function isPbrOnlyTexture(field: TextureField): boolean {
  return field === 'emissiveTexture' || field === 'bumpTexture'
}

/**
 * Get the texture union from the inner material based on field name
 */
function getTextureField(
  innerMat: PBMaterial_PbrMaterial | PBMaterial_UnlitMaterial | undefined,
  field: TextureField,
  isPbr: boolean
): TextureUnion | undefined {
  if (!innerMat) return undefined

  // For PBR-only textures on Unlit materials, return undefined
  if (isPbrOnlyTexture(field) && !isPbr) {
    return undefined
  }

  switch (field) {
    case 'texture':
      return innerMat.texture
    case 'alphaTexture':
      return innerMat.alphaTexture
    case 'emissiveTexture':
      return isPbr ? (innerMat as PBMaterial_PbrMaterial).emissiveTexture : undefined
    case 'bumpTexture':
      return isPbr ? (innerMat as PBMaterial_PbrMaterial).bumpTexture : undefined
    default:
      return undefined
  }
}

/**
 * Helper to validate that a texture is not an Avatar or Video texture
 * Throws an error if it is, since flat accessors only work with regular textures
 */
function validateNotSpecialTexture(textureUnion: TextureUnion | undefined, field: TextureField): void {
  if (textureUnion?.tex?.$case === 'avatarTexture') {
    throw new Error(
      `Cannot set ${field} properties on Avatar texture. Use setPbrMaterial/setBasicMaterial with Material.Texture.Common() to set a regular texture.`
    )
  }
  if (textureUnion?.tex?.$case === 'videoTexture') {
    throw new Error(
      `Cannot set ${field} properties on Video texture. Use setPbrMaterial/setBasicMaterial with Material.Texture.Common() to set a regular texture.`
    )
  }
}

/**
 * Helper to ensure the material has a texture structure for the given field and return it for modification
 */
function ensureTextureStructure(mat: PBMaterial, field: TextureField): Texture {
  if (!mat.material) {
    throw new Error('Material structure is invalid. Use setPbrMaterial or setBasicMaterial first.')
  }

  // Check if trying to set a PBR-only texture on Unlit material
  if (isPbrOnlyTexture(field) && mat.material.$case !== 'pbr') {
    throw new Error(`Cannot set ${field} on Unlit material. Use PBR material instead.`)
  }

  const innerMat = mat.material.$case === 'pbr' ? mat.material.pbr : mat.material.unlit
  const isPbr = mat.material.$case === 'pbr'

  // Get or create the texture union for the specified field
  let textureUnion: TextureUnion | undefined

  switch (field) {
    case 'texture':
      validateNotSpecialTexture(innerMat.texture, field)
      if (!innerMat.texture || innerMat.texture.tex?.$case !== 'texture') {
        innerMat.texture = { tex: { $case: 'texture', texture: { src: '' } } }
      }
      textureUnion = innerMat.texture
      break
    case 'alphaTexture':
      validateNotSpecialTexture(innerMat.alphaTexture, field)
      if (!innerMat.alphaTexture || innerMat.alphaTexture.tex?.$case !== 'texture') {
        innerMat.alphaTexture = { tex: { $case: 'texture', texture: { src: '' } } }
      }
      textureUnion = innerMat.alphaTexture
      break
    case 'emissiveTexture':
      if (isPbr) {
        const pbrMat = innerMat as PBMaterial_PbrMaterial
        validateNotSpecialTexture(pbrMat.emissiveTexture, field)
        if (!pbrMat.emissiveTexture || pbrMat.emissiveTexture.tex?.$case !== 'texture') {
          pbrMat.emissiveTexture = { tex: { $case: 'texture', texture: { src: '' } } }
        }
        textureUnion = pbrMat.emissiveTexture
      }
      break
    case 'bumpTexture':
      if (isPbr) {
        const pbrMat = innerMat as PBMaterial_PbrMaterial
        validateNotSpecialTexture(pbrMat.bumpTexture, field)
        if (!pbrMat.bumpTexture || pbrMat.bumpTexture.tex?.$case !== 'texture') {
          pbrMat.bumpTexture = { tex: { $case: 'texture', texture: { src: '' } } }
        }
        textureUnion = pbrMat.bumpTexture
      }
      break
  }

  // At this point we know tex.$case is 'texture', but TypeScript doesn't narrow it so we use a type assertion
  const tex = textureUnion!.tex as { $case: 'texture'; texture: Texture }
  return tex.texture
}

/**
 * Class-based accessor for FlatTexture properties.
 * Provides getters/setters that read/write to the nested material structure.
 */
class FlatTextureAccessor implements FlatTexture {
  constructor(private getMaterial: () => PBMaterial, private field: TextureField) {}

  get src(): string | undefined {
    const mat = this.getMaterial()
    const isPbr = mat.material?.$case === 'pbr'
    const innerMat = getInnerMaterial(mat)
    const textureUnion = getTextureField(innerMat, this.field, isPbr)
    const texture = getTextureFromUnion(textureUnion)
    return texture?.src
  }

  set src(value: string | undefined) {
    if (value === undefined) return
    const mat = this.getMaterial()
    const texture = ensureTextureStructure(mat, this.field)
    texture.src = value
  }

  get wrapMode(): TextureWrapMode | undefined {
    const mat = this.getMaterial()
    const isPbr = mat.material?.$case === 'pbr'
    const innerMat = getInnerMaterial(mat)
    const textureUnion = getTextureField(innerMat, this.field, isPbr)
    const texture = getTextureFromUnion(textureUnion)
    return texture?.wrapMode
  }

  set wrapMode(value: TextureWrapMode | undefined) {
    if (value === undefined) return
    const mat = this.getMaterial()
    const texture = ensureTextureStructure(mat, this.field)
    texture.wrapMode = value
  }

  get filterMode(): TextureFilterMode | undefined {
    const mat = this.getMaterial()
    const isPbr = mat.material?.$case === 'pbr'
    const innerMat = getInnerMaterial(mat)
    const textureUnion = getTextureField(innerMat, this.field, isPbr)
    const texture = getTextureFromUnion(textureUnion)
    return texture?.filterMode
  }

  set filterMode(value: TextureFilterMode | undefined) {
    if (value === undefined) return
    const mat = this.getMaterial()
    const texture = ensureTextureStructure(mat, this.field)
    texture.filterMode = value
  }
}

/**
 * Class-based accessor for FlatMaterial properties.
 * Provides getters/setters for all material properties with proper type safety.
 */
class FlatMaterialAccessor implements FlatMaterial {
  constructor(private getMaterial: () => PBMaterial) {}

  // ==================== Private Helpers ====================

  /**
   * Get PBR material if available, undefined otherwise
   */
  private getPbrMaterial(): PBMaterial_PbrMaterial | undefined {
    const mat = this.getMaterial()
    if (mat.material?.$case !== 'pbr') return undefined
    return mat.material.pbr
  }

  /**
   * Ensure material is PBR and return it, throw otherwise
   */
  private ensurePbrMaterial(propertyName: string): PBMaterial_PbrMaterial {
    const mat = this.getMaterial()
    if (!mat.material) {
      throw new Error('Material structure is invalid. Use setPbrMaterial or setBasicMaterial first.')
    }
    if (mat.material.$case !== 'pbr') {
      throw new Error(`Cannot set ${propertyName} on Unlit material. Use PBR material instead.`)
    }
    return mat.material.pbr
  }

  /**
   * Ensure inner material exists and return it, throw otherwise
   */
  private ensureInnerMaterial(): PBMaterial_PbrMaterial | PBMaterial_UnlitMaterial {
    const mat = this.getMaterial()
    if (!mat.material) {
      throw new Error('Material structure is invalid. Use setPbrMaterial or setBasicMaterial first.')
    }
    return mat.material.$case === 'pbr' ? mat.material.pbr : mat.material.unlit
  }

  /**
   * Get Unlit material if available, undefined otherwise
   */
  private getUnlitMaterial(): PBMaterial_UnlitMaterial | undefined {
    const mat = this.getMaterial()
    if (mat.material?.$case !== 'unlit') return undefined
    return mat.material.unlit
  }

  /**
   * Ensure material is Unlit and return it, throw otherwise
   */
  private ensureUnlitMaterial(propertyName: string): PBMaterial_UnlitMaterial {
    const mat = this.getMaterial()
    if (!mat.material) {
      throw new Error('Material structure is invalid. Use setPbrMaterial or setBasicMaterial first.')
    }
    if (mat.material.$case !== 'unlit') {
      throw new Error(`Cannot set ${propertyName} on PBR material. Use Unlit material instead.`)
    }
    return mat.material.unlit
  }

  // ==================== Texture Accessors ====================

  get texture(): FlatTexture {
    return new FlatTextureAccessor(this.getMaterial, 'texture')
  }

  get alphaTexture(): FlatTexture {
    return new FlatTextureAccessor(this.getMaterial, 'alphaTexture')
  }

  get emissiveTexture(): FlatTexture {
    return new FlatTextureAccessor(this.getMaterial, 'emissiveTexture')
  }

  get bumpTexture(): FlatTexture {
    return new FlatTextureAccessor(this.getMaterial, 'bumpTexture')
  }

  // ==================== Shared Properties (PBR + Unlit) ====================

  get alphaTest(): number | undefined {
    return getInnerMaterial(this.getMaterial())?.alphaTest
  }

  set alphaTest(value: number | undefined) {
    this.ensureInnerMaterial().alphaTest = value
  }

  get castShadows(): boolean | undefined {
    return getInnerMaterial(this.getMaterial())?.castShadows
  }

  set castShadows(value: boolean | undefined) {
    this.ensureInnerMaterial().castShadows = value
  }

  // ==================== PBR-only Properties ====================

  get albedoColor(): Color4 | undefined {
    return this.getPbrMaterial()?.albedoColor
  }

  set albedoColor(value: Color4 | undefined) {
    this.ensurePbrMaterial('albedoColor').albedoColor = value
  }

  get emissiveColor(): Color3 | undefined {
    return this.getPbrMaterial()?.emissiveColor
  }

  set emissiveColor(value: Color3 | undefined) {
    this.ensurePbrMaterial('emissiveColor').emissiveColor = value
  }

  get reflectivityColor(): Color3 | undefined {
    return this.getPbrMaterial()?.reflectivityColor
  }

  set reflectivityColor(value: Color3 | undefined) {
    this.ensurePbrMaterial('reflectivityColor').reflectivityColor = value
  }

  get transparencyMode(): MaterialTransparencyMode | undefined {
    return this.getPbrMaterial()?.transparencyMode
  }

  set transparencyMode(value: MaterialTransparencyMode | undefined) {
    this.ensurePbrMaterial('transparencyMode').transparencyMode = value
  }

  get metallic(): number | undefined {
    return this.getPbrMaterial()?.metallic
  }

  set metallic(value: number | undefined) {
    this.ensurePbrMaterial('metallic').metallic = value
  }

  get roughness(): number | undefined {
    return this.getPbrMaterial()?.roughness
  }

  set roughness(value: number | undefined) {
    this.ensurePbrMaterial('roughness').roughness = value
  }

  get specularIntensity(): number | undefined {
    return this.getPbrMaterial()?.specularIntensity
  }

  set specularIntensity(value: number | undefined) {
    this.ensurePbrMaterial('specularIntensity').specularIntensity = value
  }

  get emissiveIntensity(): number | undefined {
    return this.getPbrMaterial()?.emissiveIntensity
  }

  set emissiveIntensity(value: number | undefined) {
    this.ensurePbrMaterial('emissiveIntensity').emissiveIntensity = value
  }

  get directIntensity(): number | undefined {
    return this.getPbrMaterial()?.directIntensity
  }

  set directIntensity(value: number | undefined) {
    this.ensurePbrMaterial('directIntensity').directIntensity = value
  }

  // ==================== Unlit-only Property ====================

  get diffuseColor(): Color4 | undefined {
    return this.getUnlitMaterial()?.diffuseColor
  }

  set diffuseColor(value: Color4 | undefined) {
    this.ensureUnlitMaterial('diffuseColor').diffuseColor = value
  }
}

export function defineMaterialComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): MaterialComponentDefinitionExtended {
  const theComponent = Material(engine)

  return {
    ...theComponent,
    Texture: TextureHelper,
    setBasicMaterial(entity: Entity, material: PBMaterial_UnlitMaterial) {
      theComponent.createOrReplace(entity, {
        material: {
          $case: 'unlit',
          unlit: material
        }
      })
    },
    setPbrMaterial(entity: Entity, material: PBMaterial_PbrMaterial) {
      theComponent.createOrReplace(entity, {
        material: {
          $case: 'pbr',
          pbr: material
        }
      })
    },
    getFlat(entity: Entity): FlatMaterial {
      const getMaterial = () => theComponent.getMutable(entity)

      // Verify component exists immediately (fail-fast)
      getMaterial()

      return new FlatMaterialAccessor(getMaterial)
    }
  }
}

// ============ Compile-time sync validation ============
// These type assertions ensure FlatMaterial stays in sync with the generated protobuf types.
// If a new property is added to PBMaterial_PbrMaterial or PBMaterial_UnlitMaterial,
// the build will fail until FlatMaterial is updated to include it.

type TextureFields = 'texture' | 'alphaTexture' | 'emissiveTexture' | 'bumpTexture'

// Get non-texture properties from each material type
type PbrNonTextureProps = Exclude<keyof PBMaterial_PbrMaterial, TextureFields>
type UnlitNonTextureProps = Exclude<keyof PBMaterial_UnlitMaterial, TextureFields>

// Find properties that exist in the protobuf type but NOT in FlatMaterial
type MissingPbrProps = Exclude<PbrNonTextureProps, keyof FlatMaterial>
type MissingUnlitProps = Exclude<UnlitNonTextureProps, keyof FlatMaterial>

// These assignments will fail if any properties are missing.
// If MissingPbrProps or MissingUnlitProps is not 'never', the assignment to 'never' will error.
type _AssertNoPbrMissing = MissingPbrProps extends never
  ? true
  : { error: 'FlatMaterial is missing PBR properties'; missing: MissingPbrProps }
type _AssertNoUnlitMissing = MissingUnlitProps extends never
  ? true
  : { error: 'FlatMaterial is missing Unlit properties'; missing: MissingUnlitProps }

// Force compile error if assertions fail
const _pbrSyncCheck: _AssertNoPbrMissing = true
const _unlitSyncCheck: _AssertNoUnlitMissing = true
