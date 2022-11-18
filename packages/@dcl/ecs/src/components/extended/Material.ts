import { ComponentDefinition, Entity, IEngine } from '../../engine'
import * as MaterialSchema from '../generated/Material.gen'

/**
 * @public
 */
export type CustomBasicMaterial = {
  texture?: string
  avatarTexture?: string
}

/**
 * @public
 */
export interface MaterialComponentDefinition extends ComponentDefinition {
  setBasicMaterial: (entity: Entity, material: CustomBasicMaterial) => void
}

export function defineMaterialComponent(
  engine: Pick<IEngine, 'getComponent'>
): MaterialComponentDefinition {
  const Material = engine.getComponent<typeof MaterialSchema.MaterialSchema>(
    MaterialSchema.COMPONENT_ID
  )

  return {
    ...Material,
    setBasicMaterial: (entity: Entity, material: CustomBasicMaterial) => {
      const texture = 
      Material.createOrReplace(entity, {
        
      })
    }
  }
}
