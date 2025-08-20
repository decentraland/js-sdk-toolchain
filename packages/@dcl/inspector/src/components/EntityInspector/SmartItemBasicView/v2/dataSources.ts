// Color options
import { COLORS } from '../../../ui/ColorField/utils'

// Text options
import { TEXT_ALIGN_MODES, FONTS } from '../../TextShapeInspector/utils'

// Mesh options
import { SHAPES } from '../../MeshRendererInspector/utils'
import { MeshType } from '../../MeshRendererInspector/types'

// Collision options
import { COLLISION_LAYERS } from '../../GltfInspector/utils'

// Action options - these are defined as const arrays in the components
import { EMOTE_OPTIONS } from '../../ActionInspector/PlayDefaultEmoteAction/types'

// Proximity Layer options
import { LayerOptions } from '../../ActionInspector/TriggerProximityAction/types'

// Animation Play Mode options
import { PLAY_MODE_OPTIONS as ANIMATION_PLAY_MODE_OPTIONS } from '../../ActionInspector/PlayAnimationAction/types'

// Sound Play Mode options
import { PLAY_MODE_OPTIONS as SOUND_PLAY_MODE_OPTIONS } from '../../ActionInspector/PlaySoundAction/types'

// Material options
import { MATERIAL_TYPES, TRANSPARENCY_MODES } from '../../MaterialInspector/utils'
import { TEXTURE_TYPES, WRAP_MODES, FILTER_MODES } from '../../MaterialInspector/Texture/types'

// NFT options
import { NETWORKS, NFT_STYLES } from '../../NftShapeInspector/utils'

// Pointer events options
import { INPUT_ACTIONS, POINTER_EVENTS_TYPES } from '../../PointerEventsInspector/utils'

// Re-export all as a single object for easy access
export const DATA_SOURCES = {
  COLORS,
  TEXT_ALIGN_MODES,
  SHAPES,
  COLLISION_LAYERS,
  MeshType,
  FONTS,
  EMOTE_OPTIONS,
  SOUND_PLAY_MODE_OPTIONS,
  ANIMATION_PLAY_MODE_OPTIONS,
  LayerOptions,
  MATERIAL_TYPES,
  TRANSPARENCY_MODES,
  TEXTURE_TYPES,
  WRAP_MODES,
  FILTER_MODES,
  NETWORKS,
  NFT_STYLES,
  INPUT_ACTIONS,
  POINTER_EVENTS_TYPES
} as const

// Helper function to get options by data source kind
export function getDataSourceOptions(kind?: string): Array<{ value: any; label: string }> {
  switch (kind) {
    case 'colors':
      return COLORS
    case 'textAlign':
      return TEXT_ALIGN_MODES
    case 'shapes':
      return SHAPES
    case 'collisionLayers':
      return COLLISION_LAYERS
    case 'fonts':
      return FONTS
    case 'emotes':
      return EMOTE_OPTIONS
    case 'soundPlayModes':
      return SOUND_PLAY_MODE_OPTIONS
    case 'animationPlayModes':
      return ANIMATION_PLAY_MODE_OPTIONS
    case 'proximityLayers':
      return LayerOptions
    case 'materialTypes':
      return MATERIAL_TYPES
    case 'transparencyModes':
      return TRANSPARENCY_MODES
    case 'textureTypes':
      return TEXTURE_TYPES
    case 'wrapModes':
      return WRAP_MODES
    case 'filterModes':
      return FILTER_MODES
    case 'networks':
      return NETWORKS
    case 'nftStyles':
      return NFT_STYLES
    case 'inputActions':
      return INPUT_ACTIONS
    case 'pointerEventTypes':
      return POINTER_EVENTS_TYPES
    default:
      return []
  }
}
