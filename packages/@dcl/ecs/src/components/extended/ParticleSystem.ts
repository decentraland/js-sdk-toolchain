import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import {
  ParticleSystem,
  PBParticleSystem,
  PBParticleSystem_BlendMode,
  PBParticleSystem_PlaybackState,
  PBParticleSystem_Point,
  PBParticleSystem_Sphere,
  PBParticleSystem_Cone,
  PBParticleSystem_Box
} from '../generated/index.gen'
import {} from '../generated/ParticleSystem.gen'

export {
  PBParticleSystem_BlendMode as ParticleSystemBlendMode,
  PBParticleSystem_PlaybackState as ParticleSystemPlaybackState
}

/**
 * @public
 */
export interface ParticleSystemHelper {
  /** Emit from a single point */
  Point: (point?: PBParticleSystem_Point) => PBParticleSystem['shape']
  /** Emit from the surface or volume of a sphere */
  Sphere: (sphere?: PBParticleSystem_Sphere) => PBParticleSystem['shape']
  /** Emit from the base of a cone, projecting outward */
  Cone: (cone?: PBParticleSystem_Cone) => PBParticleSystem['shape']
  /** Emit from the surface or volume of a box */
  Box: (box?: PBParticleSystem_Box) => PBParticleSystem['shape']
}

/**
 * @public
 */
export interface ParticleSystemComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBParticleSystem> {
  /** Helpers for constructing emitter shapes */
  Shape: ParticleSystemHelper
}

const ParticleSystemShapeHelper: ParticleSystemHelper = {
  Point(point = {}) {
    return { $case: 'point', point }
  },
  Sphere(sphere = {}) {
    return { $case: 'sphere', sphere }
  },
  Cone(cone = {}) {
    return { $case: 'cone', cone }
  },
  Box(box = {}) {
    return { $case: 'box', box }
  }
}

export function defineParticleSystemComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): ParticleSystemComponentDefinitionExtended {
  const theComponent = ParticleSystem(engine)

  return {
    ...theComponent,
    Shape: ParticleSystemShapeHelper
  }
}
