import { ReadOnlyLastWriteWinElementSetComponentDefinition, IEngine } from "../../engine"
import { InputModifier } from "../generated/index.gen"
import { PBInputModifier_StandardInput, PBInputModifier } from "../generated/pb/decentraland/sdk/components/input_modifier.gen"

export interface InputModifierHelper {
  /**
   * @returns a input modifier mode
   */
  Standard: (standard: PBInputModifier_StandardInput) => PBInputModifier['mode']
}

export interface InputModifierComponentDefinitionExtended
  extends ReadOnlyLastWriteWinElementSetComponentDefinition<PBInputModifier> {
  Mode: InputModifierHelper
}

const InputModifierHelper: InputModifierHelper = {
  Standard(standard) {
    return {
      $case: 'standard' as const,
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
