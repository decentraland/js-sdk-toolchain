import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { LightSource, PBLightSource_Point, PBLightSource_Spot, PBLightSource } from '../generated/index.gen'
import {} from '../generated/LightSource.gen'

/**
 * @public
 */
export interface LightSourceHelper {
  /**
   * @returns a Light Source type
   */
  Point: (point: PBLightSource_Point) => PBLightSource['type']

  /**
   * @returns a Light Source type
   */
  Spot: (spot: PBLightSource_Spot) => PBLightSource['type']
}

/**
 * @public
 */
export interface LightSourceComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBLightSource> {
  /**
   * LightSource helper with constructor
   */
  Type: LightSourceHelper
}

const LightSourceHelper: LightSourceHelper = {
  Point(point) {
    return {
      $case: 'point',
      point
    }
  },
  Spot(spot) {
    return {
      $case: 'spot',
      spot
    }
  }
}

export function defineLightSourceComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): LightSourceComponentDefinitionExtended {
  const theComponent = LightSource(engine)

  return {
    ...theComponent,
    Type: LightSourceHelper
  }
}
