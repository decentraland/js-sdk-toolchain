import { LightSource } from '..'
import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
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
  Mode: InputModifierHelper
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
    Mode: InputModifierHelper
  }
}
