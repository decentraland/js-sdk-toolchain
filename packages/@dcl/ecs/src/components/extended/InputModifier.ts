import { IEngine, LastWriteWinElementSetComponentDefinition, Entity } from '../../engine'
import { InputModifier, PBInputModifier_StandardInput, PBInputModifier } from '../generated/index.gen'
import {} from '../generated/InputModifier.gen'

/**
 * @public
 */
export interface InputModifierHelper {
  /**
   * @returns a input modifier mode
   */
  Standard: (standard: PBInputModifier_StandardInput) => PBInputModifier['mode']
}

/**
 * @public
 */
export interface InputModifierComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBInputModifier> {
  /**
   * InputModifier helper with constructor
   */
  InputModifier: InputModifierHelper

  /**
   * Create or replace the component InputModifier in the entity specified
   * @param entity - the entity to link the component
   * @param inputModifier - the data for this input modifier
   */
  addStandardModifier: (entity: Entity, inputModifier: PBInputModifier_StandardInput) => void
}

const InputModifierHelper: InputModifierHelper = {
  Standard(standard: PBInputModifier_StandardInput) {
    return {
      $case: 'standard',
      standard
    }
  }
}

export function defineInputModifierComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): InputModifierComponentDefinitionExtended {
  const theComponent = InputModifier(engine)

  return {
    ...theComponent,
    InputModifier: InputModifierHelper,
    addStandardModifier(entity: Entity, inputModifier: PBInputModifier_StandardInput) {
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'standard',
          standard: inputModifier
        }
      })
    }
  }
}
